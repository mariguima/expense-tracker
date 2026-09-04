from flask import Blueprint, request, jsonify
from app import db, bcrypt
from app.models.user import User
from flask_jwt_extended import create_access_token
from marshmallow import ValidationError
from app.schemas.user_schema import UserCreateSchema, UserLoginSchema, UserSchema
from sqlalchemy import select

auth_bp = Blueprint("auth", __name__)
user_schema = UserSchema()
user_create_schema = UserCreateSchema()
user_login_schema = UserLoginSchema()


# create user in signup page
@auth_bp.route("/signup", methods=["POST"])
def signup():
    try:
        data = user_create_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    email = data["email"]
    password = data["password"]
    name = data["name"]

    existing_user = db.session.execute(select(User).filter_by(email=email)).scalar_one_or_none()
    if existing_user is not None:
        return jsonify({"error": "An account with this email already exists"}), 409

    hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")
    new_user = User(name=name, email=email, password_hash=hashed_password)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
          "message": "User created successfully",
          "user": user_schema.dump(new_user),
      }), 201


# login of user
@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = user_login_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    email = data["email"]
    password = data["password"]

    user = db.session.execute(select(User).filter_by(email=email)).scalar_one_or_none()

    if user is None or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": access_token, "user": user_schema.dump(user)}), 200
