"""painter.py rules for backup.svg: three drives (1.4 tall, 0.2 apart), then two offsite boxes (1.0 tall, 0.2 apart).
usage: python tools/painter.py site/assets/img/backup.svg 289.9 207.4 16.46 tools/rules_backup.py"""
def z0(b):
    k = b['idx'] // 3
    return k * 1.6 if k < 3 else (k - 3) * 1.2
def label(b):
    k = b['idx'] // 3
    return f'drive {k}' if k < 3 else f'offsite {k - 3}'
