"""iso.py: the projection, number format and SVG reading every drawing and check relies on."""
import math

from iso import C30, W, classify, fmt, load


def test_projection_axes():
    w = W(100, 50, 10)
    assert w.p(0, 0, 0) == (100, 50)
    x, y = w.p(1, 0, 0)                       # x runs right and down at 30 degrees
    assert math.isclose(x, 100 + C30 * 10) and math.isclose(y, 55)
    x, y = w.p(0, 1, 0)                       # y runs left and down
    assert math.isclose(x, 100 - C30 * 10) and math.isclose(y, 55)
    assert w.p(0, 0, 1) == (100, 40)          # z straight up


def test_box_faces_share_corners():
    left, right, top = W(0, 0, 20).box(0, 1, 0, 2, 0, 3)
    corners = lambda s: set(s.split())
    assert len(corners(left) & corners(right)) == 2      # the front vertical edge
    assert len(corners(left) & corners(top)) == 2
    assert len(corners(right) & corners(top)) == 2


def test_fmt():
    assert fmt(1.25) == '1.2' and fmt(1.35) == '1.4'     # round half to even, as Python rounds
    assert fmt(-0.04) == '0.0'                            # never "-0.0"
    assert fmt(3) == '3.0'


def test_classify_iso_edges():
    w = W(0, 0, 20)
    for q in ((1, 0, 0), (0, 1, 0), (0, 0, 1)):
        kind, err, off, ln = classify(w.p(0, 0, 0), w.p(*q))
        assert err < 1e-9 and off < 1e-9 and ln > 0
    assert classify((0, 0), (10, 1))[1] > 5              # a stray edge is degrees off


def test_load_applies_transforms():
    svg = ('<svg xmlns="http://www.w3.org/2000/svg"><g transform="translate(10,20)">'
           '<polygon points="0,0 4,0 4,4"/><line x1="1" y1="1" x2="2" y2="2"/></g></svg>')
    _, shapes = load(svg)
    assert [s.tag for s in shapes] == ['polygon', 'line']
    assert shapes[0].subs[0][1] == (14, 20) and shapes[0].closed
    assert shapes[1].subs[0] == [(11, 21), (12, 22)]
