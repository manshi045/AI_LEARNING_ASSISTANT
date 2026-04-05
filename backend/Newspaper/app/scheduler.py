from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from app.main import process_date

scheduler = BackgroundScheduler()

def daily_job():
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    process_date(tomorrow)

scheduler.add_job(daily_job, 'cron', hour=2)
scheduler.start()