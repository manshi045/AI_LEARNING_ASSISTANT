import redis
from app.config import REDIS_HOST, REDIS_PORT
import json

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

def get_cache(key):
    data = r.get(key)
    return json.loads(data) if data else None

def set_cache(key, value, ttl=86400):
    r.setex(key, ttl, json.dumps(value))