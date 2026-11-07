"""isogen.py: the pieces every generator writes with (boxes, labels, the card cut, hoisted styles)."""
from lxml import etree

from iso import W
from isogen import EDGE, FACES, box, card, doc, esc, hoist_styles, label, label_text_gaps


def test_box_writes_three_faces_and_logs():
    log = []
    out = box(W(0, 0, 10), (0, 1, 0, 1, 0, 1), log=log, classes=('a', '', 'c'), tail=' x="1"')
    assert log == [(0, 1, 0, 1, 0, 1)]
    assert [f'fill="{c}"' in s for s, c in zip(out, FACES)] == [True] * 3
    assert out[0].startswith('<polygon class="a" points=') and out[1].startswith('<polygon points=')
    assert all(s.endswith(f'{EDGE} x="1"/>') for s in out)


def test_label_text_is_escaped_and_parses():
    svg = doc('R&D <lab>', label((0, 0), (20, -20), 40, 'R&D', 'tools & "kit"'))
    root = etree.fromstring(svg.encode())                 # a raw & or < would not parse
    words = [t.text for t in root.iter('{http://www.w3.org/2000/svg}text')]
    assert words == ['R&D', 'tools & "kit"']
    assert root.get('aria-label') == 'R&D <lab>'
    assert esc("team's") == "team's"                     # apostrophes stay as written


def test_wrapped_title_pushes_the_subline_gap_down():
    one = dict(elbow=(0, 0), x=10, anchor='start', title='ONE', sub='sub', tw=40, sw=30)
    two = dict(one, title='ONE\nTWO')
    (t1, s1), (t2, s2) = label_text_gaps(one, 1.5), label_text_gaps(two, 1.5)
    assert s2.bounds[1] - s1.bounds[1] == 15 * 1.5        # label() moves the subline one title line down
    assert t2.bounds[3] - t1.bounds[3] == 15 * 1.5        # and the title's own gap covers its second line


def test_card_drops_labels():
    svg = doc('t', ['<rect width="1" height="1"/>', *label((0, 0), (20, -20), 40, 'TITLE', 'sub')])
    out = card(svg)
    assert 'TITLE' not in out and '<rect' in out and 'lbl' not in out


def test_card_refuses_an_unclosed_label():
    try:
        card('<svg><g class="lbl"><g></g></svg>')
    except ValueError as e:
        assert 'no closing </g>' in str(e)
    else:
        raise AssertionError('card() accepted an unclosed label group')


def test_hoist_styles_names_by_content():
    body, css = hoist_styles('<g style="--d:1ms"><a style="--d:1ms" class="x"/></g>')
    assert 'style=' not in body
    name = body.split('class="')[1].split('"')[0]
    assert body.count(name) == 2 and css == f'.{name}.{name}{{--d:1ms}}'
