from flask import Flask, render_template, request, redirect, url_for, flash, session
import os, json
from datetime import datetime

from config.config import Config
from config.const import *

app = Flask(__name__)
app.secret_key = Config.SECRET_KEY  # Set a secret key for session management

users = {
    "admin": {
        "email": "admin@example.com", 
        "password": "zhenghao135"
    },
    "ZZH39399": {
        "email": "393994653@qq.com", 
        "password": "zhenghao135"
    },
}

@app.route('/')
def index():
    # Redirect to the login page
    if "logged_in" in session and session["logged_in"]:
        return redirect(url_for("dashboard"))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == "POST":
        # 从表单获取用户名和密码
        data = json.loads(request.data)
        username = data.get("username")
        password = data.get("password")
        # username = request.form.get("username")
        # password = request.form.get("password")
        # print(username, password)

        # 验证用户凭据
        if username in users and users[username]["password"] == password:
            # 登录成功 - 设置会话
            session["user"] = username
            session["logged_in"] = True
            session["login_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            # 重定向到仪表盘或主页
            # return redirect(url_for("dashboard"))
            res = {
                "status": "success",
                "success": True,
                "message": "登录成功",
                "redirectUrl": "/dashboard",
            }
            return res
        else:
            # 登录失败 - 返回错误信息
            res = {
                "status": "success",
                "success": False,
                "message": "用户名或密码错误",
                "redirectUrl": "/login",
            }
            return res

    # 如果是GET请求，显示登录页面
    if "logged_in" in session and session["logged_in"]:
        return redirect(url_for("dashboard"))
    return render_template("login.html")

@app.route('/dashboard', methods=['GET'])
def dashboard():
    if "logged_in" not in session or not session["logged_in"]:
        return redirect(url_for('login'))
    
    user_info = {
        "username": session.get("user"),
        "login_time": session.get("login_time"),
        "email": users[session["user"]]["email"]
    }
    return render_template(
        "dashboard.html",
        user_info=user_info,
        file_number = session.get("file_number", 0),
        unread_number = session.get("unread_number", 0),
        game_record_number = session.get("game_record_number", 0),
        version=Const.VERSION,
        developer=Const.AUTHOR,
        recent_activity=session.get("recent_activity", []),
        current_date=(datetime.now().strftime("%Y-%m-%d ") + Const.week[datetime.now().weekday()]),
    )

@app.route('/logout', methods=['GET'])
def logout():
    # 清除会话数据
    session.clear()
    # flash("您已成功登出", "success")
    return redirect(url_for('login'))


if __name__ == "__main__":
    print("Starting Flask app...")
    if not os.path.exists("key.cf"):
        print("Secret key file not found, creating a new one...")
    print("App secret key: ", app.secret_key)
    app.run(debug=Config.DEBUG, port=Config.PORT)  # Run the app on port 8081 with debug mode enabled
