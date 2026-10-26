"""Local preview server with clean URLs, like Cloudflare Pages.

    python tools/serve.py            # site/ on port 8765
    python tools/serve.py 8765 site

`/work` serves `work.html`, so the site's links (which have no `.html`) work
locally. `/work.html` still works too, for the check tools. A missing page
gets `404.html`, as on Cloudflare.
"""
import functools
import http.server
import os
import sys

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
root = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else 'site')


class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = super().translate_path(path)
        if not os.path.exists(p) and os.path.exists(p + '.html'):
            return p + '.html'
        return p

    def send_error(self, code, message=None, explain=None):
        page = os.path.join(root, '404.html')
        if code != 404 or not os.path.exists(page):
            return super().send_error(code, message, explain)
        body = open(page, 'rb').read()
        self.send_response(404)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)


http.server.ThreadingHTTPServer(('', port), functools.partial(Handler, directory=root)).serve_forever()
