from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_mail import Mail, Message
from dotenv import load_dotenv
from email.message import EmailMessage
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import os
import smtplib
import sqlite3
import random
import string
from datetime import datetime, timedelta

# How long a session stays valid without the user logging in again.
SESSION_LIFETIME = timedelta(hours=8)

# Load environment variables from workspace root
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DOTENV_PATH = os.path.join(PROJECT_ROOT, '.env')
if not os.path.exists(DOTENV_PATH):
    print(f"WARNING: .env file not found at {DOTENV_PATH}")
else:
    load_dotenv(DOTENV_PATH)

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
DEFAULT_ADMIN_EMAIL = os.getenv('DEFAULT_ADMIN_EMAIL', 'admin@secureauth.io')
DEFAULT_ADMIN_PASSWORD = os.getenv('DEFAULT_ADMIN_PASSWORD', 'Admin@123')

# Configure CORS to allow requests from the local frontend and the deployed Railway/Render hosts.
configured_origins = [origin.strip() for origin in os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:8080,https://secure-auth-production-dbba.up.railway.app,https://secure-auth-1.onrender.com').split(',') if origin.strip()]
CORS(app, supports_credentials=True, origins=configured_origins)

# Configure Flask-Mail
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL', 'False').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME') or os.getenv('GMAIL_ADDRESS')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD') or os.getenv('GMAIL_APP_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER') or app.config['MAIL_USERNAME']

app.config['MAIL_DEBUG'] = True
app.config['MAIL_SUPPRESS_SEND'] = False
mail = Mail(app)

# Database configuration
DATABASE = os.path.join(os.path.dirname(__file__), "secureauth.db")

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_column(cursor, table_name, column_name, column_sql):
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [column["name"] for column in cursor.fetchall()]
    if column_name not in columns:
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_sql}")


def send_email_via_smtp(subject, recipients, body):
    server = app.config.get('MAIL_SERVER')
    port = app.config.get('MAIL_PORT')
    use_tls = app.config.get('MAIL_USE_TLS')
    use_ssl = app.config.get('MAIL_USE_SSL')
    username = app.config.get('MAIL_USERNAME')
    password = app.config.get('MAIL_PASSWORD')
    sender = app.config.get('MAIL_DEFAULT_SENDER')

    if not server or not port or not username or not password:
        raise ValueError('SMTP configuration is incomplete.')

    message = EmailMessage()
    message['Subject'] = subject
    message['From'] = sender
    message['To'] = ', '.join(recipients)
    message.set_content(body)

    if use_ssl:
        smtp = smtplib.SMTP_SSL(server, port, timeout=20)
    else:
        smtp = smtplib.SMTP(server, port, timeout=20)
        if use_tls:
            smtp.starttls()

    try:
        smtp.login(username, password)
        smtp.send_message(message)
    finally:
        smtp.quit()


def send_email(subject, recipients, body):
    try:
        msg = Message(subject, recipients=recipients)
        msg.body = body
        mail.send(msg)
        print(f"Email sent via Flask-Mail to {recipients}")
        return True
    except Exception as mail_error:
        print(f"Flask-Mail failed to send to {recipients}: {mail_error}")
        try:
            send_email_via_smtp(subject, recipients, body)
            print(f"Email sent via SMTP fallback to {recipients}")
            return True
        except Exception as smtp_error:
            print(f"SMTP fallback failed for {recipients}: {smtp_error}")
            return False


def generate_reset_token(length=32):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))


def serialize_user(user_row):
    created_at = user_row["created_at"]
    formatted_date = created_at
    if created_at:
      try:
          formatted_date = datetime.fromisoformat(str(created_at)).strftime('%b %d, %Y')
      except ValueError:
          formatted_date = str(created_at)

    account_status = user_row["account_status"]
    return {
        "userId": user_row["user_id"],
        "fullName": user_row["full_name"],
        "email": user_row["email"],
        "role": user_row["role"],
        "accountStatus": account_status,
        "status": account_status,
        "mfaEnabled": bool(user_row["mfa_enabled"]),
        "registeredAt": formatted_date,
    }


def determine_log_category(activity):
    text = activity.lower()
    if 'login' in text or 'otp' in text or 'mfa' in text or 'auth' in text:
        return 'auth'
    if 'password' in text or 'crypto' in text:
        return 'crypto'
    if 'threat' in text or 'quarantine' in text or 'invalid' in text or 'failed' in text:
        return 'threat'
    return 'system'


def parse_db_datetime(value):
    if isinstance(value, datetime):
        return value

    text = str(value)
    for fmt in ('%Y-%m-%d %H:%M:%S.%f', '%Y-%m-%d %H:%M:%S'):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return datetime.now()


def serialize_log(log_row):
    raw_status = (log_row["status"] or "Success").lower()
    severity = 'info'
    if raw_status == 'failed':
        severity = 'warning'
    if 'invalid' in log_row['activity'].lower() or 'inactive' in log_row['activity'].lower():
        severity = 'critical'

    activity_time = log_row["activity_time"]
    timestamp = str(activity_time)
    try:
        timestamp = datetime.fromisoformat(str(activity_time)).strftime('%H:%M:%S')
    except ValueError:
        timestamp = str(activity_time)

    email = log_row["email"] or 'unknown@secureauth.local'
    message = f"{log_row['activity']} for {email} from IP {log_row['ip_address'] or 'unknown'}."

    return {
        "id": f"log-{log_row['log_id']}",
        "timestamp": timestamp,
        "category": determine_log_category(log_row["activity"]),
        "message": message,
        "severity": severity,
    }

def ensure_default_admin_user():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT user_id FROM Users WHERE email = ?', (DEFAULT_ADMIN_EMAIL.lower(),))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        return

    password_hash = generate_password_hash(DEFAULT_ADMIN_PASSWORD)
    cursor.execute('''
        INSERT INTO Users (full_name, email, password_hash, role, account_status, mfa_enabled)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', ('System Administrator', DEFAULT_ADMIN_EMAIL.lower(), password_hash, 'Admin', 'Active', 1))
    conn.commit()
    conn.close()


def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Create Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role TEXT DEFAULT 'User' CHECK(role IN ('Admin', 'User')),
            account_status TEXT DEFAULT 'Active' CHECK(account_status IN ('Active', 'Inactive')),
            mfa_enabled INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    ensure_column(cursor, 'Users', 'mfa_enabled', "mfa_enabled INTEGER DEFAULT 1")
    
    # Create OTP_Verification table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS OTP_Verification (
            otp_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            otp_code VARCHAR(10) NOT NULL,
            generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            verification_status TEXT DEFAULT 'Pending' CHECK(verification_status IN ('Pending', 'Verified', 'Expired')),
            FOREIGN KEY (user_id) REFERENCES Users(user_id)
        )
    ''')
    
    # Create User_Sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS User_Sessions (
            session_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_token VARCHAR(255) UNIQUE NOT NULL,
            login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            logout_time DATETIME,
            session_status TEXT DEFAULT 'Active' CHECK(session_status IN ('Active', 'Expired', 'Closed')),
            FOREIGN KEY (user_id) REFERENCES Users(user_id)
        )
    ''')
    
    # Create Authentication_Logs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Authentication_Logs (
            log_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            activity VARCHAR(100) NOT NULL,
            ip_address VARCHAR(45),
            activity_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'Success' CHECK(status IN ('Success', 'Failed')),
            FOREIGN KEY (user_id) REFERENCES Users(user_id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Password_Reset (
            reset_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            reset_token VARCHAR(255) NOT NULL,
            generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Used', 'Expired')),
            FOREIGN KEY (user_id) REFERENCES Users(user_id)
        )
    ''')
    
    conn.commit()
    conn.close()

    ensure_default_admin_user()

# Helper function to log activity
def log_activity(user_id, activity, ip_address, status="Success"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO Authentication_Logs (user_id, activity, ip_address, status)
        VALUES (?, ?, ?, ?)
    ''', (user_id, activity, ip_address, status))
    conn.commit()
    conn.close()

# Helper function to generate OTP
def generate_otp(length=6):
    return ''.join(random.choices(string.digits, k=length))


def json_body():
    return request.get_json(silent=True) or {}


# ---------------------------------------------------------------------------
# Session verification
#
# Every request to a protected route must include the session token that was
# issued at login, sent as:  Authorization: Bearer <session_token>
#
# get_current_session() looks that token up in User_Sessions and returns the
# matching user row only if the session is Active and not expired. Nothing
# downstream should trust request data alone to decide who a user is or what
# role they have — it must come from this lookup.
# ---------------------------------------------------------------------------
def get_current_session():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None, None

    token = auth_header.split(' ', 1)[1].strip()
    if not token:
        return None, None

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT s.session_id, s.session_token, s.login_time, s.session_status, u.*
        FROM User_Sessions s
        JOIN Users u ON u.user_id = s.user_id
        WHERE s.session_token = ?
    ''', (token,))
    row = cursor.fetchone()

    if not row or row['session_status'] != 'Active':
        conn.close()
        return None, None

    login_time = parse_db_datetime(row['login_time'])
    if datetime.now() - login_time > SESSION_LIFETIME:
        cursor.execute('''
            UPDATE User_Sessions SET session_status = 'Expired' WHERE session_id = ?
        ''', (row['session_id'],))
        conn.commit()
        conn.close()
        return None, None

    conn.close()
    return row, token


def require_auth(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        user, token = get_current_session()
        if not user:
            return jsonify({"error": "Authentication required. Please log in again."}), 401
        request.current_user = user
        request.current_session_token = token
        return view_func(*args, **kwargs)
    return wrapped


def require_admin(view_func):
    @wraps(view_func)
    @require_auth
    def wrapped(*args, **kwargs):
        if request.current_user['role'] != 'Admin':
            log_activity(request.current_user['user_id'], "Unauthorized Admin Access Attempt", request.remote_addr, "Failed")
            return jsonify({"error": "Administrator access required."}), 403
        return view_func(*args, **kwargs)
    return wrapped

# Initialize database when app starts
with app.app_context():
    init_db()

# Test route
@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({"message": "SecureAuth Flask API is running!"})

# Register endpoint
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    full_name = data.get('fullName')
    email = data.get('email').lower()
    password = data.get('password')
    role = data.get('role', 'User')

    if not all([full_name, email, password]):
        return jsonify({"error": "All fields are required!"}), 400

    conn = get_db()
    cursor = conn.cursor()

    # Check if email exists
    cursor.execute('SELECT user_id FROM Users WHERE email = ?', (email,))
    if cursor.fetchone():
        conn.close()
        return jsonify({"error": "Email already registered!"}), 409

    # Hash password
    password_hash = generate_password_hash(password)

    try:
        cursor.execute('''
            INSERT INTO Users (full_name, email, password_hash, role)
            VALUES (?, ?, ?, ?)
        ''', (full_name, email, password_hash, role))
        user_id = cursor.lastrowid
        conn.commit()
        log_activity(user_id, "User Registration", request.remote_addr)

        otp_code = generate_otp()
        expires_at = datetime.now() + timedelta(minutes=5)
        cursor.execute('''
            INSERT INTO OTP_Verification (user_id, otp_code, expires_at)
            VALUES (?, ?, ?)
        ''', (user_id, otp_code, expires_at))
        conn.commit()

        email_body = f"""
Hi {full_name},

Thank you for registering with SecureAuth.
Your account has been created successfully.

Use this OTP to verify your account: {otp_code}

This code will expire in 5 minutes.

If you did not create this account, please contact support.
"""
        email_sent = send_email('Verify Your SecureAuth Account', [email], email_body)
        if email_sent:
            print(f"Registration OTP email sent to {email}")
        else:
            conn.close()
            return jsonify({"error": "Unable to send the registration OTP email. Please verify your mail configuration."}), 502

        conn.close()
        return jsonify({"message": "Registration successful! Verify your email OTP to continue.", "userId": user_id}), 201
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

# Login endpoint (step 1: password verification -> triggers OTP, does NOT create a session)
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email').lower()
    password = data.get('password')

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM Users WHERE email = ?', (email,))
    user = cursor.fetchone()

    if not user or not check_password_hash(user['password_hash'], password):
        log_activity(None, "Login Attempt (Invalid Credentials)", request.remote_addr, "Failed")
        conn.close()
        return jsonify({"error": "Invalid email or password"}), 401

    if user['account_status'] != 'Active':
        log_activity(user['user_id'], "Login Attempt (Inactive Account)", request.remote_addr, "Failed")
        conn.close()
        return jsonify({"error": "Account is inactive"}), 403

    # Password is correct, but this is only factor one. Invalidate any old
    # pending OTPs, generate a fresh one, and require it before a session
    # is created — this is what makes login itself MFA, not just registration.
    cursor.execute('''
        UPDATE OTP_Verification SET verification_status = 'Expired'
        WHERE user_id = ? AND verification_status = 'Pending'
    ''', (user['user_id'],))

    otp_code = generate_otp()
    expires_at = datetime.now() + timedelta(minutes=5)
    cursor.execute('''
        INSERT INTO OTP_Verification (user_id, otp_code, expires_at)
        VALUES (?, ?, ?)
    ''', (user['user_id'], otp_code, expires_at))
    conn.commit()

    email_body = f"""
Hi {user['full_name']},

Someone (hopefully you) just signed in to SecureAuth with your password.

Use this code to complete login: {otp_code}

This code will expire in 5 minutes. If this wasn't you, change your password immediately.
"""
    email_sent = send_email('Your SecureAuth Login Code', [email], email_body)
    if not email_sent:
        conn.close()
        return jsonify({"error": "Unable to send the login OTP email. Please verify your mail configuration."}), 502

    log_activity(user['user_id'], "Password Verified, OTP Sent", request.remote_addr)
    conn.close()

    return jsonify({
        "message": "Password verified. Enter the OTP sent to your email to complete login.",
        "userId": user['user_id'],
        "requiresOtp": True
    }), 200

# Verify OTP endpoint (step 2)
@app.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json
    user_id = data.get('userId')
    otp_code = data.get('otp')

    conn = get_db()
    cursor = conn.cursor()

    # Get latest pending OTP for user
    cursor.execute('''
        SELECT * FROM OTP_Verification
        WHERE user_id = ? AND verification_status = 'Pending'
        ORDER BY generated_at DESC LIMIT 1
    ''', (user_id,))
    otp_record = cursor.fetchone()

    if not otp_record:
        log_activity(user_id, "OTP Verification Attempt (No Pending OTP)", request.remote_addr, "Failed")
        conn.close()
        return jsonify({"error": "No pending OTP found"}), 400

    # Check if OTP is expired
    now = datetime.now()
    expires_at = parse_db_datetime(otp_record['expires_at'])
    if now > expires_at:
        cursor.execute('''
            UPDATE OTP_Verification SET verification_status = 'Expired' WHERE otp_id = ?
        ''', (otp_record['otp_id'],))
        conn.commit()
        log_activity(user_id, "OTP Verification Attempt (Expired OTP)", request.remote_addr, "Failed")
        conn.close()
        return jsonify({"error": "OTP has expired"}), 400

    # Check OTP
    if otp_record['otp_code'] != otp_code:
        log_activity(user_id, "OTP Verification Attempt (Invalid OTP)", request.remote_addr, "Failed")
        conn.close()
        return jsonify({"error": "Invalid OTP"}), 401

    # Mark OTP as verified
    cursor.execute('''
        UPDATE OTP_Verification SET verification_status = 'Verified' WHERE otp_id = ?
    ''', (otp_record['otp_id'],))
    conn.commit()

    # Create a session token
    session_token = ''.join(random.choices(string.ascii_letters + string.digits, k=64))
    cursor.execute('''
        INSERT INTO User_Sessions (user_id, session_token)
        VALUES (?, ?)
    ''', (user_id, session_token))
    conn.commit()

    # Get user data
    cursor.execute('SELECT * FROM Users WHERE user_id = ?', (user_id,))
    user = cursor.fetchone()
    log_activity(user_id, "Login Successful", request.remote_addr)
    conn.close()

    return jsonify({
        "message": "OTP verified, login successful!",
        "sessionToken": session_token,
        "user": {
            "userId": user['user_id'],
            "fullName": user['full_name'],
            "email": user['email'],
            "role": user['role'],
            "accountStatus": user['account_status']
        }
    }), 200

# Resend OTP endpoint
@app.route('/api/resend-otp', methods=['POST'])
def resend_otp():
    data = request.json
    user_id = data.get('userId')

    conn = get_db()
    cursor = conn.cursor()

    # Get user
    cursor.execute('SELECT * FROM Users WHERE user_id = ?', (user_id,))
    user = cursor.fetchone()

    if not user:
        log_activity(None, "Resend OTP Attempt (Invalid User)", request.remote_addr, "Failed")
        conn.close()
        return jsonify({"error": "User not found"}), 404

    # Mark any existing pending OTPs as expired
    cursor.execute('''
        UPDATE OTP_Verification SET verification_status = 'Expired'
        WHERE user_id = ? AND verification_status = 'Pending'
    ''', (user_id,))
    conn.commit()

    # Generate and store new OTP
    otp_code = generate_otp()
    expires_at = datetime.now() + timedelta(minutes=5)

    cursor.execute('''
        INSERT INTO OTP_Verification (user_id, otp_code, expires_at)
        VALUES (?, ?, ?)
    ''', (user_id, otp_code, expires_at))
    conn.commit()

    log_activity(user_id, "OTP Resent", request.remote_addr)

    # Send new OTP via email
    email_sent = False
    try:
        msg = Message('Your New SecureAuth OTP Code',
                      recipients=[user['email']])
        msg.body = f"""
        Hello {user['full_name']},
        
        Your new SecureAuth OTP code is: {otp_code}
        
        This code will expire in 5 minutes.
        
        If you didn't request this, please ignore this email.
        """
        mail.send(msg)
        print(f"New OTP email sent to {user['email']}")  # For debugging
        email_sent = True
    except Exception as e:
        print(f"Failed to send email: {e}")
        log_activity(user_id, "Failed to Send Resent OTP Email", request.remote_addr, "Failed")

    conn.close()
    response_payload = {"message": "New OTP sent to your email!"}
    if not email_sent:
        response_payload["message"] = "The OTP could not be delivered by email. Use this code instead."
        response_payload["debugOtp"] = otp_code
    return jsonify(response_payload), 200


@app.route('/api/logout', methods=['POST'])
@require_auth
def logout():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE User_Sessions
        SET session_status = 'Closed', logout_time = CURRENT_TIMESTAMP
        WHERE session_token = ?
    ''', (request.current_session_token,))
    conn.commit()
    conn.close()

    log_activity(request.current_user['user_id'], "Logout", request.remote_addr)
    return jsonify({"message": "Logged out successfully."}), 200


@app.route('/api/admin/users', methods=['GET'])
@require_admin
def get_admin_users():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT user_id, full_name, email, role, account_status, mfa_enabled, created_at
        FROM Users
        ORDER BY created_at DESC, user_id DESC
    ''')
    users = [serialize_user(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({"users": users}), 200


@app.route('/api/admin/users', methods=['POST'])
@require_admin
def create_admin_user():
    data = json_body()
    full_name = (data.get('fullName') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    role = data.get('role', 'User')
    account_status = data.get('accountStatus', 'Active')
    mfa_enabled = 1 if data.get('mfaEnabled', True) else 0

    if not full_name or not email or not password:
        return jsonify({"error": "Full name, email, and password are required."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT user_id FROM Users WHERE email = ?', (email,))
    if cursor.fetchone():
        conn.close()
        return jsonify({"error": "Email already registered!"}), 409

    password_hash = generate_password_hash(password)
    cursor.execute('''
        INSERT INTO Users (full_name, email, password_hash, role, account_status, mfa_enabled)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (full_name, email, password_hash, role, account_status, mfa_enabled))
    user_id = cursor.lastrowid
    conn.commit()
    cursor.execute('''
        SELECT user_id, full_name, email, role, account_status, mfa_enabled, created_at
        FROM Users
        WHERE user_id = ?
    ''', (user_id,))
    user = serialize_user(cursor.fetchone())
    conn.close()

    log_activity(user_id, "Admin Created User", request.remote_addr)
    return jsonify({"message": "User created successfully.", "user": user}), 201


@app.route('/api/admin/users/<int:user_id>', methods=['PATCH'])
@require_admin
def update_admin_user(user_id):
    data = json_body()
    allowed_fields = {
        'fullName': 'full_name',
        'role': 'role',
        'accountStatus': 'account_status',
        'mfaEnabled': 'mfa_enabled',
    }

    updates = []
    values = []
    for payload_key, column_name in allowed_fields.items():
        if payload_key in data:
            value = data[payload_key]
            if payload_key == 'mfaEnabled':
                value = 1 if value else 0
            updates.append(f"{column_name} = ?")
            values.append(value)

    if 'password' in data and data['password']:
        updates.append("password_hash = ?")
        values.append(generate_password_hash(data['password']))

    if not updates:
        return jsonify({"error": "No valid fields provided."}), 400

    conn = get_db()
    cursor = conn.cursor()
    values.append(user_id)
    cursor.execute(f"UPDATE Users SET {', '.join(updates)} WHERE user_id = ?", values)
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({"error": "User not found."}), 404

    conn.commit()
    cursor.execute('''
        SELECT user_id, full_name, email, role, account_status, mfa_enabled, created_at
        FROM Users
        WHERE user_id = ?
    ''', (user_id,))
    user = serialize_user(cursor.fetchone())
    conn.close()

    log_activity(user_id, "Admin Updated User", request.remote_addr)
    return jsonify({"message": "User updated successfully.", "user": user}), 200


@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@require_admin
def delete_admin_user(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT email FROM Users WHERE user_id = ?', (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "User not found."}), 404

    cursor.execute('DELETE FROM User_Sessions WHERE user_id = ?', (user_id,))
    cursor.execute('DELETE FROM OTP_Verification WHERE user_id = ?', (user_id,))
    cursor.execute('DELETE FROM Authentication_Logs WHERE user_id = ?', (user_id,))
    cursor.execute('DELETE FROM Users WHERE user_id = ?', (user_id,))
    conn.commit()
    conn.close()

    log_activity(None, f"Admin Deleted User {user['email']}", request.remote_addr)
    return jsonify({"message": "User deleted successfully."}), 200


@app.route('/api/admin/logs', methods=['GET'])
@require_admin
def get_admin_logs():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT l.log_id, l.activity, l.ip_address, l.activity_time, l.status, u.email
        FROM Authentication_Logs l
        LEFT JOIN Users u ON u.user_id = l.user_id
        ORDER BY l.activity_time DESC, l.log_id DESC
        LIMIT 250
    ''')
    logs = [serialize_log(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({"logs": logs}), 200


@app.route('/api/admin/logs', methods=['DELETE'])
@require_admin
def clear_admin_logs():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM Authentication_Logs')
    conn.commit()
    conn.close()
    return jsonify({"message": "Authentication logs cleared successfully."}), 200


@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    email = (data.get('email') or '').strip().lower()
    if not email:
        return jsonify({"error": "Email is required."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT user_id, full_name FROM Users WHERE email = ?', (email,))
    user = cursor.fetchone()

    if not user:
        # Respond generically so attackers cannot enumerate accounts.
        conn.close()
        return jsonify({"message": "If that email exists, a reset link has been sent."}), 200

    reset_token = generate_reset_token()
    expires_at = datetime.now() + timedelta(minutes=30)

    cursor.execute('''
        INSERT INTO Password_Reset (user_id, reset_token, expires_at)
        VALUES (?, ?, ?)
    ''', (user['user_id'], reset_token, expires_at))
    conn.commit()

    reset_link = f"http://localhost:3000/reset-password?token={reset_token}&email={email}"
    email_body = f"""
Hello {user['full_name']},

We received a request to reset your SecureAuth password.

Click the link below to reset your password within the next 30 minutes:

{reset_link}

If you did not request this, you can ignore this message.
"""
    email_sent = send_email('SecureAuth Password Reset', [email], email_body)
    if not email_sent:
        print(f"Password reset email failed for {email}")

    conn.close()
    return jsonify({"message": "If that email exists, a reset link has been sent."}), 200


@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    email = (data.get('email') or '').strip().lower()
    token = (data.get('token') or '').strip()
    new_password = data.get('password')

    if not email or not token or not new_password:
        return jsonify({"error": "Email, token, and new password are required."}), 400

    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT user_id FROM Users WHERE email = ?', (email,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "Invalid reset request."}), 400

    cursor.execute('''
        SELECT reset_id, expires_at, status FROM Password_Reset
        WHERE user_id = ? AND reset_token = ?
        ORDER BY reset_id DESC LIMIT 1
    ''', (user['user_id'], token))
    reset_row = cursor.fetchone()

    if not reset_row or reset_row['status'] != 'Pending':
        conn.close()
        return jsonify({"error": "Invalid or expired reset token."}), 400

    expires_at = parse_db_datetime(reset_row['expires_at'])
    if datetime.now() > expires_at:
        cursor.execute('UPDATE Password_Reset SET status = "Expired" WHERE reset_id = ?', (reset_row['reset_id'],))
        conn.commit()
        conn.close()
        return jsonify({"error": "Reset token has expired."}), 400

    password_hash = generate_password_hash(new_password)
    cursor.execute('UPDATE Users SET password_hash = ? WHERE user_id = ?', (password_hash, user['user_id']))
    cursor.execute('UPDATE Password_Reset SET status = "Used" WHERE reset_id = ?', (reset_row['reset_id'],))
    conn.commit()
    conn.close()

    log_activity(user['user_id'], 'Password Reset', request.remote_addr)
    return jsonify({"message": "Password has been reset successfully."}), 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)