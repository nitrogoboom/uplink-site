"""Depth order straight from the generators' own BOXES lists: every box is drawn after the boxes behind it, and none
pokes into another. painter.py checks the same on the written SVG (reading the boxes back out of it); this needs no
SVG and no hand-typed origin or scale."""
import pytest

from iso import W
from isogen import silhouette
from painter import errors


def scenes():
    import gen_campus, gen_grow, gen_hq, gen_office
    gen_hq.build()
    yield 'hq', gen_hq.w, list(gen_hq.BOXES)
    for v in ('office', 'hero'):
        gen_office.render(v)
        yield f'office {v}', gen_office.w, list(gen_office.BOXES)
    gen_grow.build('world')
    yield 'grow', gen_grow.w, list(gen_grow.BOXES)
    gen_campus.build()
    yield 'campus', W(0, 0, gen_campus.U), list(gen_campus.BOXES)


SCENES = list(scenes())


def items(w, boxes):
    return [dict(box=b, sil=silhouette(w, *b)) for b in boxes]


@pytest.mark.parametrize('name, w, boxes', SCENES, ids=[s[0] for s in SCENES])
def test_boxes_in_depth_order(name, w, boxes):
    assert len(boxes) > 10
    bad = [(kind, a['box'], b['box']) for kind, a, b, _ov in errors(items(w, boxes))]
    assert bad == []


def test_the_check_can_fail():
    # the same scene drawn front to back: the check must object
    _name, w, boxes = SCENES[0]
    assert any(kind == 'ORDER' for kind, *_ in errors(items(w, boxes[::-1])))
