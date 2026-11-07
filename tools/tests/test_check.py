"""check.py on small hand-made drawings: it finds a real near-miss, and leaves alone what can't be seen or is meant."""
import subprocess
import sys

from conftest import TOOLS

FACE = 'fill="#4D5863"'


def run(tmp_path, body):
    f = tmp_path / 'd.svg'
    f.write_text(f'<svg xmlns="http://www.w3.org/2000/svg">\n{body}\n</svg>\n')
    r = subprocess.run([sys.executable, str(TOOLS / 'check.py'), str(f)], capture_output=True, text=True)
    return r.returncode, [line for line in r.stdout.splitlines() if line and not line.startswith('DOT')]


def test_clean_drawing_passes(tmp_path):
    code, out = run(tmp_path, f'<polygon points="0,0 40,0 40,40 0,40" {FACE}/>\n<polygon points="40,0 80,0 80,40 40,40" {FACE}/>')
    assert (code, out) == (0, [])


def test_vertex_a_hair_off_an_edge_is_found(tmp_path):
    code, out = run(tmp_path, f'<polygon points="0,0 40,0 40,40 0,40" {FACE}/>\n<polygon points="40.6,10 80,10 80,30 40.6,30" {FACE}/>')
    assert code == 1 and any(o.startswith('TJOIN') for o in out)


def test_two_shapes_on_one_line_are_compared(tmp_path):
    # the SNAP blind spot: shapes written on one source line used to be skipped
    code, out = run(tmp_path, f'<polygon points="0,0 40,0 40,40" {FACE}/><polygon points="41,0 80,0 80,40" {FACE}/>')
    assert code == 1 and any(o.startswith('SNAP') for o in out)


def test_near_miss_under_a_later_face_is_not_reported(tmp_path):
    body = (f'<polygon points="0,0 40,0 40,40 0,40" {FACE}/>\n<polygon points="40.6,10 80,10 80,30 40.6,30" {FACE}/>\n'
            f'<polygon points="30,-5 60,-5 60,45 30,45" {FACE}/>')        # drawn last, covers both
    assert run(tmp_path, body) == (0, [])


def test_see_through_cover_does_not_hide(tmp_path):
    body = (f'<polygon points="0,0 40,0 40,40 0,40" {FACE}/>\n<polygon points="40.6,10 80,10 80,30 40.6,30" {FACE}/>\n'
            f'<polygon points="30,-5 60,-5 60,45 30,45" {FACE} fill-opacity="0.4"/>')
    assert run(tmp_path, body)[0] == 1


def test_leaders_marks_and_floor_are_skipped(tmp_path):
    body = (f'<polygon points="0,0 40,0 40,40 0,40" {FACE}/>\n'
            '<g class="co"><polyline points="40.6,10 90,10" fill="none"/></g>\n'
            '<polyline class="mark" points="40.5,20 90,20" fill="none"/>\n'
            '<g class="grid floor"><line x1="40.4" y1="30" x2="90" y2="30"/></g>')
    assert run(tmp_path, body) == (0, [])
