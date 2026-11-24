# Builds the home page body of the Rovai Heavy Industries site from the content tables below.
# The <head> is kept from the current file, apart from the description lines, and the first three
# figures (wheels, rings, document) are read back from the current page, so keep those cards first.
# usage: python3 _tools/build_home.py . [--slugs]
import re, sys, os, html

repo = sys.argv[1]
path = os.path.join(repo, 'index.html')
s = open(path, encoding='utf-8').read()
head = s[:s.index('<body class="page-home">')]
figs = re.findall(r'<svg class="fig".*?</svg>', s, re.S)
assert len(figs) >= 3, len(figs)
fig_a, fig_b, fig_c = figs[0], figs[1], figs[2]

GH = 'https://github.com/fabio-rovai/'
DESC = 'Rovai Heavy Industries builds ontologies, reasoning engines and verification software for AI systems that have to be right. London.'
head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="%s">' % DESC, head, count=1)
head = re.sub(r'("description": ")[^"]*(",\s*\n\s*"foundingDate")', lambda m: m.group(1) + DESC + m.group(2), head, count=1)
assert head.count(DESC) == 2, head.count(DESC)

arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>'
nut = '<svg class="brand-nut" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M22 12l-5 8.66H7L2 12l5-8.66h10zM12 7.8a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 0 0 0-8.4z"/></svg>'
e = html.escape

# ---------------------------------------------------------------- figures
def svg(label, inner):
    return '<svg class="fig" viewBox="0 0 400 400" role="img" aria-label="%s">%s</svg>' % (e(label), inner)

# two columns of terms and the correspondences between them
ys = [80, 120, 160, 200, 240, 280, 320]
pairs = [(0, 0), (1, 2), (2, 1), (3, 3), (4, 5), (5, 4)]
d = ''
for i, (a, b) in enumerate(pairs):
    cls = 'h ink' if a != b else 'b ink'
    d += '<path class="%s" pathLength="1" d="M120 %dL280 %d" style="--d:%d"/>' % (cls, ys[a], ys[b], 300 + i * 120)
for i, y in enumerate(ys):
    d += '<circle class="bf fd" cx="120" cy="%d" r="3" style="--d:%d"/><circle class="bf fd" cx="280" cy="%d" r="3" style="--d:%d"/>' % (y, i * 60, y, i * 60)
d += '<circle class="h fd run beat" cx="120" cy="320" r="8" style="--d:1300"/><circle class="h fd run beat" cx="280" cy="320" r="8" style="--d:1400;animation-delay:-1.6s"/>'
d += '<text class="fd" x="120" y="50" text-anchor="middle" style="--d:900">IES</text><text class="fd" x="280" y="50" text-anchor="middle" style="--d:1000">HQDM</text>'
d += '<text class="fd" x="200" y="360" text-anchor="middle" style="--d:1500">No counterpart</text>'
fig_d = svg('Two columns of terms joined by lines, two of the lines crossing and one term on each side left without a counterpart: a crosswalk between two ontologies.', d)

# a chain with one weak link
c = ''
for i in range(6):
    cx = 70 + 52 * i
    if i == 3:
        c += '<circle class="h fd run beat" cx="%d" cy="200" r="34" stroke-dasharray="3 6" style="--d:%d"/>' % (cx, 700)
    else:
        c += '<circle class="a ink" pathLength="1" cx="%d" cy="200" r="34" style="--d:%d"/>' % (cx, i * 110)
c += '<path class="b fd" d="M226 240V262" style="--d:1100"/><text class="fd" x="226" y="280" text-anchor="middle" style="--d:1200">Weakest link</text>'
c += '<path class="b fd" d="M36 138H364" stroke-dasharray="2 7" style="--d:900"/><text class="fd" x="36" y="126" style="--d:1000">Claimed assurance</text>'
fig_e = svg('A chain of six rings, one of them broken: the level of assurance a credential really carries is set by its weakest link.', c)

# a schema tree turning into graph statements
f = '<path class="b ink" pathLength="1" d="M70 200L150 120M70 200H150M70 200L150 280" style="--d:0"/>'
f += '<circle class="bf fd" cx="70" cy="200" r="4" style="--d:300"/>'
for i, y in enumerate((120, 200, 280)):
    f += '<circle class="bf fd" cx="150" cy="%d" r="3" style="--d:%d"/>' % (y, 400 + i * 80)
    f += '<path class="h fd" d="M166 %dH232" stroke-dasharray="2 6" style="--d:%d"/>' % (y, 800 + i * 120)
    f += '<path class="a ink" pathLength="1" d="M250 %dH330" style="--d:%d"/>' % (y, 1000 + i * 120)
    f += '<circle class="bf fd" cx="250" cy="%d" r="4" style="--d:%d"/><circle class="bf fd" cx="330" cy="%d" r="4" style="--d:%d"/>' % (y, 1100 + i * 120, y, 1200 + i * 120)
f += '<text class="fd" x="70" y="70" style="--d:600">JSON Schema</text><text class="fd" x="330" y="70" text-anchor="end" style="--d:1400">RDF</text>'
fig_f = svg('A schema tree on the left becomes three graph statements on the right: a metadata profile bound to RDF from its own schema.', f)

# a map of parcels with one picked out
g = '<path class="a ink" pathLength="1" d="M70 80H330V320H70Z" style="--d:0"/>'
g += '<path class="b ink" pathLength="1" d="M150 80V320M235 80V200M270 200V320M70 160H235M150 200H330M70 255H150M270 262H330" style="--d:400"/>'
g += '<path class="h ink" pathLength="1" d="M150 200H270V320H150Z" style="--d:1100"/>'
for i in range(5):
    g += '<path class="%s fd" d="M%d 350H%d" style="--d:%d;stroke-width:2"/>' % ('h' if i == 2 else 'b', 150 + i * 26, 168 + i * 26, 1500 + i * 90)
g += '<text class="fd" x="70" y="62" style="--d:900">Parcels</text><text class="fd" x="150" y="374" style="--d:1900">Five methods</text>'
fig_g = svg('A map of land parcels with one parcel picked out and five marks beneath it: one parcel valued five ways.', g)

# nine courses, 147 lessons
lessons = [17, 15, 18, 14, 16, 19, 15, 17, 16]
assert sum(lessons) == 147
h = ''
for i, n in enumerate(lessons):
    y = 92 + 28 * i
    h += '<path class="a fd" d="M70 %dH%d" stroke-dasharray="0.1 13.9" style="--d:%d;stroke-width:4"/>' % (y, 70 + 14 * (n - 1), 200 + i * 110)
h += '<text class="fd" x="70" y="62" style="--d:0">Nine courses</text><text class="fd" x="330" y="62" text-anchor="end" style="--d:1300">147 lessons</text>'
h += '<path class="h fd" d="M70 352H330" style="--d:1400"/>'
fig_h = svg('Nine rows of dots, 147 in all: nine courses and their lessons.', h)

# ---------------------------------------------------------------- content
features = [
    ('f-oo', 'Open Ontologies', 'The ontology engine built for AI agents', 'OWL 2 DL reasoning, SHACL validation and SPARQL in one Rust binary, served over MCP.', 'View on GitHub', GH + 'open-ontologies', fig_a),
    ('f-tardygrada', 'Tardygrada', 'A verified runtime for AI agents', 'Every claim passes eight layers of verification before it counts. No LLM judges an LLM.', 'View on GitHub', GH + 'tardygrada', fig_b),
    ('f-bitf', 'Brain in the Fish', 'Score any document. Prove every claim.', 'Document verification grounded in an ontology.', 'View on GitHub', GH + 'brain-in-the-fish', fig_c),
    ('f-ies', 'IES and HQDM', 'The first public crosswalk between two 4D defence ontologies', 'Correspondences between the UK Information Exchange Standard and HQDM, with a record of where the two diverge.', 'View on GitHub', GH + 'ies-hqdm-crosswalk', fig_d),
    ('f-laundering', 'Assurance Laundering', 'When a compliant-looking credential carries no assurance', 'A cross-standard ontology and machine-checked proofs in Lean 4, presented at TDI 2026 at the Alan Turing Institute.', 'View on GitHub', GH + 'assurance-laundering', fig_e),
    ('f-dcat', 'DCAT-US', 'A national metadata profile, validated against its own published artifacts', 'A JSON-LD context and SHACL shapes for DCAT-US 3.0, generated from the profile\'s own JSON Schema.', 'View on GitHub', GH + 'dcat-us-binding', fig_f),
    ('f-land', 'Land valuation', 'Five ways to value land, tested for the Welsh Government', 'Research for the land value tax evidence programme, published on GOV.WALES in March 2026.', 'Read on GOV.WALES', 'https://www.gov.wales/testing-land-valuation-methods-tesseract-academy', fig_g),
    ('f-curriculum', 'Curriculum', 'An ontology engineering curriculum, published as an ontology', 'Nine free courses and 147 lessons in OWL 2 and SKOS, each crosswalked to the standards it teaches.', 'View on GitHub', GH + 'ontology-curriculum', fig_h),
]

wares = [
    ('Open Ontologies', 'Plan, apply and roll back changes to a production ontology, with a proof an auditor can re-check', 'open-ontologies'),
    ('Tardygrada', 'Run AI agents whose every claim passes eight layers of verification before it counts', 'tardygrada'),
    ('Brain in the Fish', 'Score any document and prove every claim in it', 'brain-in-the-fish'),
    ('WorldProof', 'Compile ontologies and data into world models whose every inference carries a machine-checkable certificate', 'worldproof'),
    ('mcp-former', 'Put existing software behind a verification gate, so AI agents can drive it safely', 'mcp-former'),
]

sectors = [
    ('Financial services', [
        ('Investment fund ontology', 'investment-fund-ontology'), ('Securities register ontology', 'securities-register-ontology'),
        ('Legal entity identifier conformance', 'iso17442'), ('Sanctions identifier assurance', 'opensanctions-identifier-assurance'),
        ('Company accounts benchmark', 'ixbrl-disclosure-benchmark'), ('Pension illustration engine', 'pension-illustration-lab'),
        ('Collateral optimisation benchmark', 'qollateral'), ('On-chain control census', 'chain-control-ontology')]),
    ('Government and public data', [
        ('UK register ontology', 'uk-register-ontology'), ('Italy register ontology', 'italy-register-ontology'),
        ('Korea register ontology', 'korea-register-ontology'), ('Taiwan register ontology', 'taiwan-register-ontology'),
        ('Scotland land register ontology', 'scotland-land-register-ontology'), ('Open data catalogue assurance', 'open-data-catalog-ontology'),
        ('DCAT-US binding', 'dcat-us-binding'), ('US federal vocabulary assessment', 'semantic-asset-register'),
        ('UK evaluation atlas', 'uk-evaluation-atlas'), ('UK consultation corpus', 'uk-consultation-corpus')]),
    ('Defence and space', [
        ('IES and HQDM crosswalk', 'ies-hqdm-crosswalk'), ('IES4 space extension', 'ies4-space'),
        ('Space metrics crosswalk', 'space-metrics-crosswalk'), ('Space object knowledge graph', 'neurosymbolic-space-kg'),
        ('Cyber simulation framework', 'CyberSim-LLM-Driven-Cybersecurity-Simulation-Framework')]),
    ('Health and life sciences', [
        ('Health dataset catalogue ontology', 'health-dataset-catalogue-ontology'), ('Health data linkage ontology', 'health-data-linkage-ontology'),
        ('Food safety alert ontology', 'biosurveillance-ontology'), ('Spectral library ontology', 'spectral-library-ontology'),
        ('Sociotechnical evaluation matrix', 'sociotechnical-matrix-assurance')]),
    ('Law, regulation and standards', [
        ('EU regulatory instrument register', 'regulatory-instrument-register'), ('UK trade remedy ontology', 'trade-remedy-ontology'),
        ('AI management system assurance', 'ai-management-system-assurance'), ('Certification register ontology', 'certification-register-ontology'),
        ('Specification conformance ontology', 'specification-conformance-ontology'), ('OpenAPI conformance checks', 'oascheck'),
        ('Algorithmic transparency records', 'uk-algorithmic-transparency')]),
    ('Industry and logistics', [
        ('Construction standards crosswalks', 'construction-standards-crosswalks'), ('Cargo data standards audit', 'cargo-semantics'),
        ('ONE Record domain extension', 'onerecord-domain-extension'), ('Machinery regulation standards', 'machinery-semantics'),
        ('Road collision scenario registers', 'scenario-register-ontology'), ('Enterprise knowledge ontology', 'enterprise-knowledge-ontology')]),
    ('Environment and climate', [
        ('Earth observation verifiability standard', 'eo-verifiability-standard'), ('Nature-related security risk', 'nature-security-risk'),
        ('Waste vocabulary crosswalk', 'waste-vocab-crosswalk'), ('Parametric insurance payout standard', 'payout-assurance-standard')]),
    ('AI and research', [
        ('Geospatial agent guard', 'geo-agent-guard'), ('Financial answer verification', 'financebench-verification'),
        ('World model kernel', 'worldkernel'), ('Knowledge engineering challenge entry', 'keac-2026'),
        ('Scholarly record ontology', 'scholarly-record-ontology'), ('Media attention ontology', 'media-attention-ontology'),
        ('Open Ontologies for Obsidian', 'obsidian-open-ontologies')]),
]

cases = [
    ('Welsh Government', 'Five ways to value land, tested', 'Research for the land value tax evidence programme. It tests five valuation approaches, including statistical valuation and machine learning, and was published on GOV.WALES in March 2026.', ('Read on GOV.WALES', 'https://www.gov.wales/testing-land-valuation-methods-tesseract-academy')),
    ('The Alan Turing Institute', 'Language agents for cyber defence', 'Research on reinforcement-learning language agents in emulated networks for threat detection, from December 2023 to January 2025.', None),
    ('National Digital Twin Programme', 'An AI-driven tool for extending an ontology', 'Ontology tooling built for the programme in 2025.', None),
    ('Innovate UK BridgeAI', 'AI for the creative industries', 'A BridgeAI programme for the creative industries, led from 2025 to 2026.', None),
]
clients = ['WRAP', 'Kalgera', 'Etiq AI', 'Fintech Scotland', 'University of the Arts London', 'NeurIPS']

news = [
    ('OM 2026<br>ISWC 2026, Bari', 'Consistency Is Not Coherence', 'The first public alignment of the IES, HQDM and BFO upper ontologies, accepted as a long paper at the 21st International Workshop on Ontology Matching.', ('Read the paper', 'https://arxiv.org/abs/2608.21914')),
    ('WASP 2026<br>AACL-IJCNLP 2026', 'Recovering Method Parameters from Protocol Prose', 'A workshop paper that defines the task, audits the extraction and sets out which comparisons the recovered parameters support.', None),
    ('SEMANTiCS 2026<br>Ghent, 17 September 2026', 'Conformance Over Nothing', 'An accepted demonstration: a JSON-LD context and SHACL shapes for DCAT-US 3.0, generated out of the RDF binding already inside its own JSON Schema.', ('See the binding', GH + 'dcat-us-binding')),
    ('TDI 2026<br>The Alan Turing Institute, 16 September 2026', 'Assurance Laundering', 'Lean theorems across eight credential stacks, giving the conditions under which a compliant-looking credential carries no assurance at all.', ('See the proofs', GH + 'assurance-laundering')),
    ('GOV.WALES<br>17 March 2026', 'Testing land valuation methods', 'Published by the Welsh Government as part of its land value tax evidence programme.', ('Read the report', 'https://www.gov.wales/testing-land-valuation-methods-tesseract-academy')),
]

icons = {
    'works': '<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M7.5 6h9M6.3 8.2l4.4 7.6M17.7 8.2l-4.4 7.6"/>',
    'school': '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v4.5c0 1.7 2.7 3 6 3s6-1.3 6-3V11"/><path d="M22 9v6"/>',
    'shop': '<path d="M8 6l-5 6 5 6M16 6l5 6-5 6M13.5 4l-3 16"/>',
    'labs': '<path d="M9 3h6"/><path d="M10 3v6.2L4.6 18.6A1.6 1.6 0 0 0 6 21h12a1.6 1.6 0 0 0 1.4-2.4L14 9.2V3"/><path d="M7.4 15h9.2"/>',
}
units = [
    ('works', 'Reasoning Works', 'AI and data science', 'Strategy, implementation and governance for organisations adopting AI, from the boardroom to the production pipeline.', ['Machine learning', 'LLMs', 'Responsible AI', 'Data strategy']),
    ('school', 'Training School', 'Training and education', 'Courses, workshops and corporate programmes that turn teams into practitioners. More than 1,000 professionals trained so far.', ['Corporate training', 'Higher education', 'AI literacy', 'Leadership']),
    ('shop', 'Machine Shop', 'Technology', 'Open-source products and infrastructure for AI systems, written in Rust and C and built in the open.', ['Open source', 'Rust', 'Systems programming', 'MCP servers']),
    ('labs', 'Research Laboratories', 'Research', 'Applied research, publications and academic partnerships, with work for the Alan Turing Institute and Innovate UK.', ['NeurIPS', 'Ethics review', 'Public sector', 'Policy']),
]

# ---------------------------------------------------------------- markup
def ext(url):
    return ' target="_blank" rel="noopener"' if url.startswith('http') else ''

chips_html = ''.join('<button class="chip" type="button" data-go="%s" aria-current="%s">%s</button>' % (f[0], 'true' if i == 0 else 'false', e(f[1])) for i, f in enumerate(features))
features_html = ''
for fid, label, title, text, go, url, fig in features:
    features_html += '''                    <article class="feature" id="%s">
                        <div class="feature-art">%s</div>
                        <a class="feature-link" href="%s"%s>
                            <div class="feature-tag">
                                <p class="mono">%s</p>
                                <h3 class="feature-title">%s</h3>
                                <p class="feature-text">%s</p>
                            </div>
                            <span class="feature-go">%s</span>
                        </a>
                    </article>
''' % (fid, fig, url, ext(url), e(label), e(title), e(text), e(go))

wares_html = ''
for i, (name, desc, slug) in enumerate(wares):
    wares_html += '''                        <li class="reveal" style="--i:%d"><a class="ware" href="%s" target="_blank" rel="noopener"><span class="ware-name">%s</span><span class="ware-no mono">/0.%d</span><span class="ware-desc">%s</span><svg class="ware-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg></a></li>
''' % (i % 3, GH + slug, e(name), i + 1, e(desc))

sectors_html = ''
for i, (name, items) in enumerate(sectors):
    lis = ''.join('<li><a href="%s" target="_blank" rel="noopener">%s</a></li>' % (GH + slug, e(label)) for label, slug in items)
    sectors_html += '''                        <div class="sector reveal" style="--i:%d">
                            <h3 class="mono">%s</h3>
                            <ul>%s</ul>
                        </div>
''' % (i % 4, e(name), lis)

cases_html = ''
for i, (client, title, text, link) in enumerate(cases):
    more = '\n                            <a class="arrow-link" href="%s" target="_blank" rel="noopener">%s</a>' % (link[1], e(link[0])) if link else ''
    cases_html += '''                        <li class="case reveal" style="--i:%d">
                            <p class="mono">%s</p>
                            <h3>%s</h3>
                            <p class="case-text">%s</p>%s
                        </li>
''' % (i % 2, e(client), e(title), e(text), more)

news_html = ''
for i, (where, title, text, link) in enumerate(news):
    more = '<a class="arrow-link" href="%s" target="_blank" rel="noopener">%s</a>' % (link[1], e(link[0])) if link else '<span></span>'
    news_html += '''                        <li class="reveal">
                            <p class="mono">%s</p>
                            <div><h3>%s</h3><p class="news-text">%s</p></div>
                            %s
                        </li>
''' % (where, e(title), e(text), more)

units_html = ''
for i, (icon, name, kicker, text, tags) in enumerate(units):
    units_html += '''                        <li class="unit reveal" style="--i:%d">
                            <p class="mono">0%d</p>
                            <svg class="unit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>
                            <h3>%s</h3>
                            <p class="mono unit-kicker">%s</p>
                            <p class="unit-text">%s</p>
                            <ul class="tags">%s</ul>
                        </li>
''' % (i, i + 1, icons[icon], e(name), e(kicker), e(text), ''.join('<li>%s</li>' % e(t) for t in tags))

foot_software = ''.join('<a href="%s" target="_blank" rel="noopener">%s</a>' % (GH + slug, e(name)) for name, _, slug in wares)

body = '''<body class="page-home">

    <a class="skip" href="#main">Skip to content</a>

    <header class="nav" id="nav">
        <div class="nav-bar">
            <a class="brand" href="#top" aria-label="Rovai Heavy Industries, home">
                %(nut)s
                <span class="brand-name">Rovai <span>Heavy Industries</span></span>
            </a>
            <nav aria-label="Primary">
                <ul class="nav-links" id="nav-links">
                    <li><a href="#software">Software</a></li>
                    <li><a href="#sectors">Sectors</a></li>
                    <li><a href="#work">Work</a></li>
                    <li><a href="#latest">Latest</a></li>
                    <li><a href="#company">Company</a></li>
                    <li><a href="#careers">Careers</a></li>
                    <li><a href="#contact" class="nav-cta">Get in touch</a></li>
                </ul>
            </nav>
            <button class="nav-toggle" type="button" aria-label="Menu" aria-expanded="false" aria-controls="nav-links"><i></i><i></i></button>
        </div>
        <div class="nav-progress" aria-hidden="true"></div>
    </header>

    <main id="main">

        <section class="hero" data-field>
            <canvas class="hero-gl" aria-hidden="true"></canvas>
            <div class="hero-inner">
                <p class="hero-eyebrow mono">Rovai Heavy Industries</p>
                <h1 class="hero-line">Heavy industry for machine reasoning</h1>
                <p class="hero-sub">Ontologies, reasoning engines and verification software for AI systems that have to be right.</p>
                <div class="hero-actions">
                    <a href="#software" class="btn btn-molten">Our software %(arrow)s</a>
                    <a href="#contact" class="btn btn-steel">Get in touch</a>
                </div>
            </div>
            <p class="hero-cue mono" aria-hidden="true">Scroll<i></i></p>
        </section>

        <div class="floor">

            <section class="featured" id="featured">
                <div class="wrap featured-head">
                    <h2 class="mono">Featured work</h2>
                    <div class="chips">%(chips)s</div>
                </div>
                <div class="reel">
%(features)s                </div>
            </section>

            <section class="statement" aria-label="What we build">
                <div class="wrap">
                    <p class="statement-text">We build the load-bearing parts of AI systems: the ontologies, the engines that reason over them, and the software that checks an AI's work before anyone relies on it.</p>
                </div>
            </section>

            <section class="bay" id="software">
                <div class="wrap">
                    <h2 class="bay-rule mono"><b>Our software</b></h2>
                    <ul class="wares">
%(wares)s                    </ul>
                </div>
            </section>

            <section class="bay bay-alt" id="sectors">
                <div class="wrap">
                    <header class="bay-head">
                        <p class="bay-rule mono"><b>Open work by sector</b></p>
                        <h2 class="display reveal">Assurance for the registers and standards that institutions run on</h2>
                        <p class="lede reveal" style="--i:1">More than 90 public repositories: ontologies, crosswalks and audits that anyone can run, re-check and build on.</p>
                    </header>
                    <div class="sectors">
%(sectors)s                    </div>
                </div>
            </section>

            <section class="bay" id="work">
                <div class="wrap">
                    <header class="bay-head">
                        <p class="bay-rule mono"><b>Work delivered</b></p>
                        <h2 class="display reveal">Research and engineering for public institutions</h2>
                        <p class="lede reveal" style="--i:1">Engagements we have led, several of them with The Tesseract Academy.</p>
                    </header>
                    <ul class="cases">
%(cases)s                    </ul>
                    <div class="worked">
                        <p class="bay-rule mono">Also worked with<i></i></p>
                        <ul class="clients">%(clients)s</ul>
                    </div>
                </div>
            </section>

            <section class="bay bay-alt" id="output">
                <div class="wrap">
                    <h2 class="bay-rule mono"><b>Output to date</b></h2>
                    <div class="gauges reveal">
                        <div class="gauge">
                            <p class="counter" data-value="1000" data-suffix="+">1,000+</p>
                            <p class="gauge-label mono">Professionals trained</p>
                        </div>
                        <div class="gauge">
                            <p class="counter" data-value="58" data-suffix="+">58+</p>
                            <p class="gauge-label mono">Public sector tenders</p>
                        </div>
                        <div class="gauge">
                            <p class="counter" data-value="90" data-suffix="+">90+</p>
                            <p class="gauge-label mono">Open repositories</p>
                        </div>
                        <div class="gauge">
                            <p class="counter" data-value="2900" data-suffix="+">2,900+</p>
                            <p class="gauge-label mono">GitHub stars, Open Ontologies</p>
                        </div>
                    </div>
                </div>
            </section>

            <section class="bay" id="latest">
                <div class="wrap">
                    <header class="bay-head">
                        <p class="bay-rule mono"><b>Latest</b></p>
                        <h2 class="display reveal">Papers, proofs and publications</h2>
                    </header>
                    <ul class="news">
%(news)s                    </ul>
                </div>
            </section>

            <section class="bay bay-alt" id="company">
                <div class="wrap">
                    <header class="bay-head">
                        <p class="bay-rule mono"><b>The company</b></p>
                        <h2 class="display reveal">Four works, one group</h2>
                        <p class="lede reveal" style="--i:1">Rovai Heavy Industries is a London company, established in 2021. Heavy industry makes the things everything else stands on, and that is the part of AI we build.</p>
                    </header>
                    <ul class="units">
%(units)s                    </ul>
                </div>
            </section>

            <section class="careers" id="careers">
                <div class="wrap">
                    <div class="careers-panel">
                        <div>
                            <p class="bay-rule mono"><b>Careers</b></p>
                            <h2 class="display reveal">Build the part everything else stands on</h2>
                        </div>
                        <div class="careers-side reveal" style="--i:1">
                            <p>We hire engineers, researchers, designers and operators who would rather work across trades than stay in one box.</p>
                            <p>There are no open roles listed today. Write and tell us what you would build.</p>
                            <a href="mailto:careers@fabiorovai.com" class="btn btn-steel">careers@fabiorovai.com</a>
                        </div>
                    </div>
                </div>
            </section>

            <section class="cta" id="contact" aria-label="Contact">
                <div class="wrap tiles">
                    <a class="tile on-bone" href="mailto:fabio@fabiorovai.com">
                        <span class="tile-top">Get in touch %(arrow)s</span>
                        <span class="tile-note">AI adoption projects, team training, research collaborations and tools that do not exist yet.</span>
                    </a>
                    <a class="tile tile-line" href="%(gh)sopen-ontologies" target="_blank" rel="noopener">
                        <span class="tile-top">Start building %(arrow)s</span>
                        <span class="tile-note">Open Ontologies is free to run and take apart. Start with the repository.</span>
                    </a>
                </div>
            </section>

        </div>
    </main>

    <footer class="foot">
        <div class="wrap">
            <div class="foot-word" aria-hidden="true"></div>
            <div class="foot-cols">
                <p class="legal"><strong>Registered company</strong>Rovai Heavy Industries is the trading name of Fabio Rovai Ltd, a company registered in England and Wales, number 13809380.</p>
                <nav class="foot-col" aria-label="Software"><p class="mono">Software</p>%(foot_software)s</nav>
                <nav class="foot-col" aria-label="Work"><p class="mono">Work</p><a href="#featured">Featured work</a><a href="#sectors">Open work by sector</a><a href="#work">Work delivered</a><a href="#latest">Latest</a></nav>
                <nav class="foot-col" aria-label="Company"><p class="mono">Company</p><a href="#company">The group</a><a href="#careers">Careers</a><a href="#contact">Contact</a></nav>
                <nav class="foot-col" aria-label="Elsewhere"><p class="mono">Elsewhere</p><a href="https://github.com/fabio-rovai" target="_blank" rel="noopener">GitHub</a><a href="#top">Back to top</a></nav>
            </div>
            <div class="foot-base mono">
                <p>&copy; 2026 Rovai Heavy Industries. London, UK.</p>
                <p>Heavy industry for machine reasoning</p>
            </div>
        </div>
    </footer>

    <script src="/assets/forge.js" defer></script>
    <script src="/assets/site.js" defer onerror="document.documentElement.classList.remove('js')"></script>

</body>
</html>
''' % dict(nut=nut, arrow=arrow, chips=chips_html, features=features_html, wares=wares_html, sectors=sectors_html, cases=cases_html,
           clients=''.join('<li class="reveal" style="--i:%d">%s</li>' % (i, e(c)) for i, c in enumerate(clients)),
           news=news_html, units=units_html, foot_software=foot_software, gh=GH)

open(path, 'w', encoding='utf-8').write(head + body)
slugs = sorted(set(re.findall(r'github\.com/fabio-rovai/([A-Za-z0-9_.-]+)', body)))
print(len(head + body), 'bytes;', len(slugs), 'repositories linked;', sum(len(x[1]) for x in sectors), 'sector links')
if '--slugs' in sys.argv:   # one repository name per line, to check each is public before publishing
    print('\n'.join(slugs))
