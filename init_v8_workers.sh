#!/bin/bash
# Initialize limits for V8 workers
# Must be run with sudo

mkdir -p /home/john/.cache/kiro/Crashpad
chown john:john /home/john/.cache/kiro/Crashpad

if mount | grep -q "cgroup2"; then
    mkdir -p /sys/fs/cgroup/v8_worker_pool
    echo "10485760" > /sys/fs/cgroup/v8_worker_pool/memory.max || true
    echo "0" > /sys/fs/cgroup/v8_worker_pool/memory.swap.max || true
    echo "$$" > /sys/fs/cgroup/v8_worker_pool/cgroup.procs
else
    mkdir -p /sys/fs/cgroup/memory/v8_worker_pool
    echo "10485760" > /sys/fs/cgroup/memory/v8_worker_pool/memory.limit_in_bytes || true
    echo "$$" > /sys/fs/cgroup/memory/v8_worker_pool/tasks
fi

# Point Kiro execution to the v8 memory profiler
rm -f /usr/bin/kiro
cat << 'EOF' > /usr/bin/kiro
#!/bin/bash
node /home/john/usr/share/kiro/v8-memory-profiler.js "$@"
EOF
chmod +x /usr/bin/kiro
