# app/routes/auth.py

from flask import Blueprint, request, jsonify
from app import db, bcrypt
from app.models.user import User
from flask_jwt_extended import create_access_token

auth_bp = Blueprint("auth", __name__)


# create user in signup page
@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    name = data.get("name")

    if not email or not password or not name:
        return jsonify({"error": "Email, name and password are required"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user is not None:
        return jsonify({"error": "An account with this email already exists"}), 409

    hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")
    new_user = User(name=name, email=email, password_hash=hashed_password)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User created successfully", "user_id": new_user.id}), 201


# login of user
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()

    if user is None or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": access_token, "user_id": user.id}), 200
