import os
import secrets

class Config:
    DEBUG = True  # Enable debug mode for development
    PORT = 8081  # Port to run the Flask application
    
    # open "key.cf" and read the Secret Key
    if not os.path.exists("key.cf"):
        # If the file does not exist, create it with a new secret key
        SECRET_KEY = secrets.token_hex(16)
        with open("key.cf", "w") as f:
            f.write(SECRET_KEY)
    with open("key.cf", "r") as f:
        SECRET_KEY = f.read().strip()
        
    
