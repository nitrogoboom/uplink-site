"""Builds the hero-select footer markup into src/components/Footer.html, then rebuilds the pages.
Edit the CONTENT lists below to change the footer; run again to update all pages.
usage: python tools/build_footer.py
"""
import sys, html, pathlib, subprocess

I = {
    'grid': '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    'building': '<path d="M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M15 9h3a1 1 0 0 1 1 1v11M3 21h18M8.5 8h3M8.5 12h3M8.5 16h3"/>',
    'headset': '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
    'book': '<path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h13"/><path d="M8 7h7"/>',
    'chat': '<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4z"/>',
    'phone': '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
    'mail': '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6"/>',
    'pin': '<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    'clock': '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    'arrow': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'chev': '<path d="M9 6l6 6-6 6"/>',
    'left': '<path d="M15 6l-6 6 6 6"/>',
    'signal': '<path d="M5 13a7 7 0 0 1 14 0M8.5 13a3.5 3.5 0 0 1 7 0"/><circle cx="12" cy="17" r="1.5"/>',
    'logo': '<path d="M5 14l7-7 7 7"/><path d="M8.5 19l3.5-3.5 3.5 3.5"/>',
    'profile': '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    'video': '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5l4.5 2.5-4.5 2.5z"/>',
    'photo': '<rect x="3" y="6" width="18" height="14" rx="3"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/>',
    'post': '<path d="M4 5h16v11H10l-6 4z"/><path d="M8 9h8M8 12h5"/>',
    'community': '<circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c1-3.5 3.5-5 6-5s5 1.5 6 5M15 15.5c2.5 0 4.5 1.2 5.5 4"/>',
}
def ic(k, w=1.8):
    return f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{I[k]}</svg>'
e = lambda s: html.escape(s, quote=True)

# ---------------- CONTENT ----------------
# Link groups. "map" picks the spot on the campus map: services, industries,
# company, support, resources (anything else points at HQ).
GROUPS = [
    dict(id='services', map='services', name='Services', icon='grid',
         lead='Everything your office runs on, looked after by one team.',
         more=('Compare all services', 'services'),
         links=[('Managed help desk', 'services#help-desk'), ('Cybersecurity', 'services#security'),
                ('Microsoft 365 & Google', 'services#cloud'), ('Networks & Wi-Fi', 'services#network'),
                ('Phones & Teams calling', 'services#voip'),
                ('Backup & recovery', 'services#backup'), ('IT strategy & planning', 'services#strategy')]),
    dict(id='company', map='company', name='Company', icon='building',
         lead='The people behind the screen, and how we work.',
         more=('Meet the team', 'about#team'),
         links=[('About us', 'about'), ('Our work', 'work'), ('Team', 'about#team'),
                ('Our story', 'about#story'), ('Careers', 'soon#careers')]),
    dict(id='support', map='support', name='Support', icon='headset',
         lead='Already a client? Get help or check on a ticket.',
         more=('Get support now', 'contact#support'),
         links=[('Client portal', 'soon#client-portal'), ('Remote support', 'soon#remote-support'),
                ('System status', 'soon#system-status'), ('Contact the help desk', 'contact#support')]),
    dict(id='resources', map='resources', name='Resources', icon='book',
         lead='Guides and checklists we hand our own clients.',
         more=('Browse the blog', 'soon#blog'),
         links=[('Blog', 'soon#blog'), ('Windows 10 guide', 'soon#windows-10-guide'),
                ('Security checklist', 'soon#security-checklist'), ('Questions and answers', 'services#faq')]),
]
SOCIALS = [('LinkedIn', 'profile', '/company/uplinkit'), ('YouTube', 'video', '@uplinkit'),
           ('Facebook', 'community', '/uplinkit'), ('Instagram', 'photo', '@uplink.it'), ('X', 'post', '@uplinkit')]
SOCIAL_HREF = 'soon#social'
LEGAL = [('Privacy', 'soon#privacy'), ('Terms', 'soon#terms'), ('Accessibility', 'soon#accessibility')]

# ---------------- MARKUP ----------------
def head(eyebrow, title, lead):
    return (f'<div class="fc-head"><p class="eyebrow">{eyebrow}</p><h2>{title}</h2></div>'
            f'<p class="fc-lead">{lead}</p>')

def socials_row():
    return ''.join(f'<li><a class="fc-soc" href="{SOCIAL_HREF}" aria-label="{n}" title="{n}">{ic(k)}</a></li>' for n, k, _ in SOCIALS)

panels, tiles = [], []
def add(pid, mapkey, name, icon, count, body):
    first = not panels
    panels.append(f'<section class="fc-panel{" is-on" if first else ""}" id="fc-p-{pid}" role="tabpanel" aria-labelledby="fc-t-{pid}" tabindex="-1" data-map="{mapkey}">\n{body}\n</section>')
    tiles.append(f'<button class="fc-tile" type="button" role="tab" id="fc-t-{pid}" aria-controls="fc-p-{pid}" aria-selected="{"true" if first else "false"}" tabindex="{0 if first else -1}">'
                 f'<span class="icon-tile">{ic(icon)}</span><span class="fc-tile-n">{name}</span><span class="fc-tile-c">{count}</span></button>')

add('contact', 'hq', 'Contact', 'chat', 'Start here',
    head('Managed IT · Ontario', 'Ready when <em>you are</em>', 'Start with a free 30-minute check-up. We look first, then quote.') +
    f'''<div class="fc-body">
  <div class="fc-acts"><a class="btn btn--primary btn--lg" href="contact#message" data-open="book-dialog">Book a check-up{ic('arrow', 2)}</a></div>
  <div class="fc-facts">
    <div><p class="label">Reach us</p>
      <a class="fc-cl" href="tel:+18555550142">{ic('phone')}<span>1-855-555-0142</span></a>
      <a class="fc-cl" href="mailto:hello@uplinkit.ca">{ic('mail')}<span>hello@uplinkit.ca</span></a></div>
    <div><p class="label">Office</p>
      <p class="fc-cl fc-cl--two">{ic('pin')}<span>Toronto<small>100 King St W, Suite 4200</small></span></p>
      <p class="fc-cl fc-cl--two">{ic('clock')}<span>7 am to 7 pm ET<small>Monday to Friday</small></span></p></div>
  </div>
  <div class="fc-follow"><span class="label">Follow</span><ul class="fc-socials">{socials_row()}</ul></div>
</div>''')

for g in GROUPS:
    rows = ''.join(f'<li><a class="fc-link" href="{h}">{e(t)}{ic("arrow", 2)}</a></li>' for t, h in g['links'])
    more = f'<a class="link-arrow" href="{g["more"][1]}">{e(g["more"][0])}{ic("arrow", 2)}</a>' if g.get('more') else ''
    add(g['id'], g['map'], g['name'], g['icon'], f'{len(g["links"])} links',
        head(f'{len(g["links"])} links', e(g['name']), e(g['lead'])) +
        f'<nav class="fc-body" aria-label="{e(g["name"])}"><ul class="fc-rows{" fc-rows--two" if len(g["links"]) > 3 else ""}">{rows}</ul>{more}</nav>')

wall = ''.join(f'<li><a class="fc-wall-item" href="{SOCIAL_HREF}"><span class="icon-tile">{ic(k)}</span><span><b>{n}</b><small>{h}</small></span></a></li>' for n, k, h in SOCIALS)
add('follow', 'follow', 'Follow', 'signal', f'{len(SOCIALS)} channels',
    head(f'{len(SOCIALS)} channels', 'Follow <em>Uplink</em>', 'Short fixes, security alerts and the odd office tour.') +
    f'''<div class="fc-body">
  <ul class="fc-wall">{wall}</ul>
  <form class="fc-nl" data-fc-nl novalidate>
    <label class="label" for="fc-nl-email"><span class="sr-only">Email for </span>The Monthly Patch</label>
    <div class="fc-nl-row"><input class="input" id="fc-nl-email" name="email" type="email" placeholder="you@company.com" autocomplete="email" required aria-describedby="fc-nl-msg"><button class="btn btn--secondary" type="submit">Subscribe</button></div>
    <p class="small muted" id="fc-nl-msg" data-fc-nl-msg>One email a month. Threats to watch and fixes that matter.</p>
  </form>
</div>''')

legal = ''.join(f'<a href="{h}">{t}</a>' for t, h in LEGAL) + '<a href="soon#francais" lang="fr" hreflang="fr">Français</a>'
FOOTER = f'''<footer class="site-footer fc" id="footer" aria-labelledby="fc-title">
  <h2 class="sr-only" id="fc-title">Site footer</h2>
  <div class="container fc-stage">
    <div class="fc-panels" id="fc-panels">
{chr(10).join(panels)}
    </div>
    <div class="fc-map" data-fc-map>
      <div class="fc-hud" aria-live="polite"></div>
    </div>
  </div>
  <div class="fc-dock"><div class="container">
    <button class="fc-rk" type="button" data-fc-step="-1" aria-label="Previous footer section">{ic('left', 2.2)}</button>
    <div class="fc-roster" role="tablist" aria-label="Footer sections">
      {(chr(10) + '      ').join(tiles)}
    </div>
    <button class="fc-rk" type="button" data-fc-step="1" aria-label="Next footer section">{ic('chev', 2.2)}</button>
  </div></div>
  <div class="fc-base"><div class="container">
    <span class="fc-brand"><span class="fc-mark" aria-hidden="true">{ic('logo', 2.6)}</span><b>Uplink</b><span>© 2026 Uplink Technology Inc.</span></span>
    <nav class="fc-legal" aria-label="Legal">{legal}</nav>
    <span class="fc-base-end">
      <button class="linkbtn kbd-only" type="button" data-open="shortcuts-dialog"><span class="kbd">?</span>Keyboard shortcuts</button>
      <span class="status">All systems normal · Help desk open 7 am to 7 pm ET</span>
    </span>
  </div></div>
</footer>'''

NOTE = """<!--- SHARED · Footer (every page). GENERATED: edit the lists in
      tools/build_footer.py and run it. Don't edit this file by hand.
      Styles: src/styles/footer.css. Script: assets/js/footer.js.
--->
"""
root = pathlib.Path(__file__).resolve().parent.parent
(root / 'src/components/Footer.html').write_text(NOTE + FOOTER + '\n', encoding='utf-8', newline='\n')
print('footer -> src/components/Footer.html')
subprocess.run([sys.executable, str(root / 'tools/build_pages.py')], check=True)
