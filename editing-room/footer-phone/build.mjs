// Builds the footer phone mockups: mockups.template.html with the site's own campus map (public/assets/img/campus.svg,
// written by tools/gen_campus.py) inlined at <!--CAMPUS--> as a <template>, so the page is one file.
// Run from the project root: node editing-room/footer-phone/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const here = new URL('.', import.meta.url);
const read = (p) => readFileSync(new URL(p, here), 'utf8');
const campus = read('../../public/assets/img/campus.svg');
const page = read('mockups.template.html').replace('<!--CAMPUS-->', () => campus);
writeFileSync(new URL('mockups.html', here), page);
console.log(`mockups.html: ${(page.length / 1024).toFixed(0)} KB`);
