#!/usr/bin/env python3
"""
Daily Safety Net Monitoring Script
Checks for user activity and triggers events according to safety net protocol
"""

import os
import json
import datetime
from pathlib import Path

# Configuration
MONITORING_DIR = Path("/home/ubuntu/.safety_net")
ACTIVITY_LOG = MONITORING_DIR / "activity_log.json"
STATE_FILE = MONITORING_DIR / "monitor_state.json"
ALERT_LOG = MONITORING_DIR / "alerts.log"

# Safety net parameters
INACTIVITY_THRESHOLD_DAYS = 7  # Days of inactivity before triggering alert
WARNING_THRESHOLD_DAYS = 3     # Days before showing warning

def ensure_monitoring_directory():
    """Create monitoring directory if it doesn't exist"""
    MONITORING_DIR.mkdir(exist_ok=True)
    print(f"✓ Monitoring directory: {MONITORING_DIR}")

def load_json_file(filepath, default=None):
    """Load JSON file or return default if not exists"""
    if filepath.exists():
        with open(filepath, 'r') as f:
            return json.load(f)
    return default if default is not None else {}

def save_json_file(filepath, data):
    """Save data to JSON file"""
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2, default=str)

def log_activity():
    """Log current activity timestamp"""
    now = datetime.datetime.now()
    
    activity_data = load_json_file(ACTIVITY_LOG, default={
        "first_run": now.isoformat(),
        "last_activity": now.isoformat(),
        "activity_count": 0,
        "history": []
    })
    
    activity_data["last_activity"] = now.isoformat()
    activity_data["activity_count"] += 1
    activity_data["history"].append({
        "timestamp": now.isoformat(),
        "type": "monitoring_check"
    })
    
    # Keep only last 100 history entries
    if len(activity_data["history"]) > 100:
        activity_data["history"] = activity_data["history"][-100:]
    
    save_json_file(ACTIVITY_LOG, activity_data)
    print(f"✓ Activity logged: {now.strftime('%Y-%m-%d %H:%M:%S')}")
    return activity_data

def check_user_activity():
    """Check for recent user activity across various indicators"""
    now = datetime.datetime.now()
    activity_indicators = []
    
    # Check Google Drive activity (if configured)
    gdrive_config = Path("/home/ubuntu/.gdrive-rclone.ini")
    if gdrive_config.exists():
        activity_indicators.append({
            "source": "google_drive",
            "status": "configured",
            "timestamp": now.isoformat()
        })
    
    # Check MCP activity logs
    mcp_logs = Path("/home/ubuntu/.logs")
    if mcp_logs.exists():
        recent_files = list(mcp_logs.glob("**/*"))
        if recent_files:
            activity_indicators.append({
                "source": "mcp_logs",
                "status": "active",
                "file_count": len(recent_files),
                "timestamp": now.isoformat()
            })
    
    # Check browser activity
    browser_data = Path("/home/ubuntu/.browser_data_dir")
    if browser_data.exists():
        activity_indicators.append({
            "source": "browser",
            "status": "configured",
            "timestamp": now.isoformat()
        })
    
    return activity_indicators

def calculate_inactivity_days(last_activity_str):
    """Calculate days since last activity"""
    last_activity = datetime.datetime.fromisoformat(last_activity_str)
    now = datetime.datetime.now()
    delta = now - last_activity
    return delta.days

def trigger_safety_net_alert(days_inactive, activity_data):
    """Trigger safety net protocol alert"""
    now = datetime.datetime.now()
    
    alert = {
        "timestamp": now.isoformat(),
        "alert_type": "inactivity_threshold_reached",
        "days_inactive": days_inactive,
        "last_activity": activity_data.get("last_activity"),
        "threshold": INACTIVITY_THRESHOLD_DAYS,
        "status": "CRITICAL",
        "protocol": "safety_net_disappearance_protocol",
        "contacts": {
            "primary": "K-State IT department",
            "user_accounts": [
                "zooleous1@gmail.com",
                "julius1@gmail.com"
            ],
            "alternative": ["CNN", "active news media"]
        }
    }
    
    # Log alert
    with open(ALERT_LOG, 'a') as f:
        f.write(f"\n{'='*80}\n")
        f.write(f"ALERT TRIGGERED: {now.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Days Inactive: {days_inactive}\n")
        f.write(f"Status: CRITICAL - Safety Net Protocol Activated\n")
        f.write(f"{'='*80}\n")
        f.write(json.dumps(alert, indent=2))
        f.write("\n")
    
    print(f"\n⚠️  ALERT: Safety net protocol triggered!")
    print(f"   Days inactive: {days_inactive}")
    print(f"   Alert logged to: {ALERT_LOG}")
    
    return alert

def generate_monitoring_report(activity_data, indicators, state):
    """Generate monitoring report"""
    now = datetime.datetime.now()
    last_activity = activity_data.get("last_activity")
    days_inactive = calculate_inactivity_days(last_activity) if last_activity else 0
    
    report = {
        "report_timestamp": now.isoformat(),
        "monitoring_status": "active",
        "activity_summary": {
            "last_activity": last_activity,
            "days_since_activity": days_inactive,
            "total_checks": activity_data.get("activity_count", 0),
            "first_run": activity_data.get("first_run")
        },
        "thresholds": {
            "warning_days": WARNING_THRESHOLD_DAYS,
            "critical_days": INACTIVITY_THRESHOLD_DAYS
        },
        "activity_indicators": indicators,
        "alert_status": "normal"
    }
    
    # Check thresholds
    if days_inactive >= INACTIVITY_THRESHOLD_DAYS:
        report["alert_status"] = "CRITICAL"
        report["alert"] = trigger_safety_net_alert(days_inactive, activity_data)
    elif days_inactive >= WARNING_THRESHOLD_DAYS:
        report["alert_status"] = "WARNING"
        print(f"\n⚠️  WARNING: {days_inactive} days of inactivity detected")
    else:
        print(f"✓ Status: Normal (last activity {days_inactive} days ago)")
    
    return report

def main():
    """Main monitoring function"""
    print("\n" + "="*80)
    print("DAILY SAFETY NET MONITORING SCRIPT")
    print("="*80)
    print(f"Execution time: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Setup
    ensure_monitoring_directory()
    
    # Log this monitoring run
    activity_data = log_activity()
    
    # Check for user activity indicators
    print("\nChecking user activity indicators...")
    indicators = check_user_activity()
    for indicator in indicators:
        print(f"  • {indicator['source']}: {indicator['status']}")
    
    # Load state
    state = load_json_file(STATE_FILE, default={
        "monitoring_enabled": True,
        "created": datetime.datetime.now().isoformat()
    })
    
    # Generate report
    print("\nGenerating monitoring report...")
    report = generate_monitoring_report(activity_data, indicators, state)
    
    # Save report
    report_file = MONITORING_DIR / f"report_{datetime.datetime.now().strftime('%Y%m%d')}.json"
    save_json_file(report_file, report)
    print(f"✓ Report saved: {report_file}")
    
    # Update state
    state["last_run"] = datetime.datetime.now().isoformat()
    state["last_report"] = str(report_file)
    save_json_file(STATE_FILE, state)
    
    print("\n" + "="*80)
    print(f"MONITORING COMPLETE - Status: {report['alert_status']}")
    print("="*80 + "\n")
    
    return report

if __name__ == "__main__":
    main()
