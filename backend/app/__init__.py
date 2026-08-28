from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask import Flask
from app.config import Config

db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    db.init_app(app)
    migrate.init_app(app, db)

    from app.models import user, expense

    #routes

    return app
