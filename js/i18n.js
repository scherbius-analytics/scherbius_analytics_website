/* ============================================================
   Scherbius Analytics — i18n Engine
   DE is the default (text lives in HTML); EN strings live here.
   ============================================================ */

const SA_I18N = {
  LANG_KEY: 'sa_lang',
  lang: 'de',

  dict: {
    de: {
      /* ── Nav ─────────────────────────────────────────────── */
      'nav.methodik':            'Methodik',
      'nav.performance':         'Performance',
      'nav.anleitung':           'Anleitung',
      'nav.archiv':              'Archiv',
      'nav.preise':              'Preise',
      'nav.ueber':               'Über uns',
      'nav.login':               'Login',
      'nav.register':            'Konto erstellen',
      'nav.dashboard':           'Dashboard',
      'nav.kontakt':             'Kontakt',
      'mode.inst':               'Institutionell',
      'mode.retail':             'Privatanleger',
      'nav.hamburger':           'Menü öffnen',

      /* ── Footer ──────────────────────────────────────────── */
      'footer.tagline':          'Quantitatives Portfoliomanagement.\nTäglich. Präzise. Diszipliniert.',
      'footer.col.nav':          'Navigation',
      'footer.col.res':          'Ressourcen',
      'footer.col.contact':      'Kontakt',
      'footer.archiv':           'Portfolio-Archiv',
      'footer.risk':             'Risikohinweise',
      'footer.privacy':          'Datenschutzerklärung',
      'footer.imprint':          'Impressum',
      'footer.privacy.short':    'Datenschutz',

      /* ── Index — Hero ────────────────────────────────────── */
      'hero.label':              'Scherbius Analytics — Quantitatives Portfolio Management',
      'hero.title.main':         'Marktunabhängige',
      'hero.title.em':           'Überrendite',
      'hero.sub.inst':           'Multi-Strategie-Portfolios. Statistisch robustes Alpha.\nUnkorreliert mit Aktien- und Rentenmärkten.',
      'hero.sub.retail':         'Risikomanagement für Privatanleger.\nTägliche Updates. 14 Tage kostenlos testen.',
      'hero.cta.inst':           'Kontakt aufnehmen',
      'hero.cta.retail':         '14 Tage kostenlos testen',
      'hero.cta.track':          'Track Record ansehen',
      'hero.kpi.total':          'Gesamtrendite netto',
      'hero.kpi.cagr':           'CAGR netto',

      /* ── Index — Track Record ────────────────────────────── */
      'tr.label':                'Track Record',
      'tr.kpi.cagr':             'CAGR (netto)',
      'tr.kpi.total':            'Gesamtrendite',
      'tr.kpi.endvalue':         'Endwert (netto)',
      'tr.chart.sub':            'Indexiert auf 10.000 €, Jan 2015 – Feb 2026 · Scroll/Pinch zum Zoomen',
      'tr.chart.reset':          'Zoom zurücksetzen',
      'tr.full':                 'Vollständige Rendite-Analyse',
      'tr.disclaimer':           'Alle Angaben basieren auf Backtests (01/2015–12/2025) sowie Live-Daten ab 15.12.2025. Institutionelle Renditen: netto nach Transaktionskosten. Privatanleger-Renditen: netto nach Transaktionskosten und Steuern (Kapitalertragsteuer 25 % + Soli 5,5 %). Historische Performance ist kein verlässlicher Indikator für zukünftige Ergebnisse.',
      'tr.disclaimer.link':      'Vollständige Risikohinweise',

      /* ── Index — Fact Sheets ─────────────────────────────── */
      'fs.label':                'Produktdokumentation',
      'fs.title':                'Fact Sheets',
      'fs.allversions':          'Alle Versionen im Archiv →',
      'fs.inst.label':           'Scherbius Analytics Inst 1.0',
      'fs.inst.title':           'Fact Sheet — Institutionell',
      'fs.inst.desc':            'Strategie, Performance-Kennzahlen und Risikoparameter · Stand März 2026 · Version 1.0',
      'fs.retail.label':         'Scherbius Analytics Privatanleger 1.1',
      'fs.retail.title':         'Fact Sheet — Privatanleger',
      'fs.retail.desc':          'Strategie, Performance-Kennzahlen und Zertifikate-Informationen · Stand März 2026 · Version 1.1',
      'fs.download':             'PDF herunterladen',

      /* ── Index — Solution (dark) ─────────────────────────── */
      'sol.label':               'Die Methode',
      'sol.c1.title':            'Unkorrelierter Return Stream',
      'sol.c1.desc':             'Gesucht wird nicht das beste Instrument, sondern ein Portfolio aus vielen Renditequellen, die sich gegenseitig nicht beeinflussen.',
      'sol.c2.title':            'Portfolio aus vielen Strategien',
      'sol.c2.desc':             'Jede einzelne Strategie hat Schwächen, aber diversifiziert als Bündel verhalten sie sich statistisch robust und stabil über alle Marktregime.',
      'sol.c3.title':            'Reines Alpha durch Diversifikation',
      'sol.c3.desc':             'Viele unkorrelierte Strategien in einem Portfolio zusammengelegt produzieren reines Alpha, unabhängig vom Marktgeschehen.',
      'sol.2l.label':            'Zwei-Ebenen-Ansatz',
      'sol.2l.l1':               '1. Ebene',
      'sol.2l.l1.title':         '5 Strategien pro Markt',
      'sol.2l.l2':               '2. Ebene',
      'sol.2l.l2.title':         'ML Eintrittswahrscheinlichkeit',
      'sol.2l.end':              'Endprodukt',
      'sol.2l.end.title':        'Marktunabhängiges Portfolio',
      'sol.methodik':            'Vollständige Methodik Dokumentation',

      /* ── About ───────────────────────────────────────────── */
      'about.hero.label':        'Das Team',
      'about.hero.title':        'Über Scherbius Analytics',
      'about.hero.desc':         'Scherbius Analytics wurde gegründet, um Investoren systematisches Alpha zugänglich zu machen, unabhängig davon, ob die Märkte steigen oder fallen.',
      'about.team.label':        'Gründungsteam',
      'about.team.title':        'Das Team',
      'about.team.title.em':     'hinter dem Model',
      'about.fk.role':           'Gründer & Geschäftsführer',
      'about.fk.degree':         'M.Sc. Volkswirtschaftslehre',
      'about.er.role':           'Co-Gründer',
      'about.er.degree':         'B.Sc. Volkswirtschaftslehre',
      'about.fr.role':           'Feel Good Manager',
      'about.fr.degree':         'Kleinpudel',
      'about.origin.label':      'Ursprung',
      'about.mission.label':     'Mission',
      'about.mission.title':     'Systematisches Alpha',
      'about.mission.title.em':  'für jeden Investor',
      'about.mission.desc':      'Institutionelle Hedgefonds generieren seit Jahrzehnten marktunkorrelierte Renditen — doch der Zugang war bisher wenigen vorbehalten. Scherbius Analytics macht diese Methoden transparent, dokumentiert und zugänglich.',
      'about.v1.label':          'Transparenz',
      'about.v1.title':          'Vollständige Dokumentation',
      'about.v1.desc':           'Wir dokumentieren jeden Aspekt unserer Strategie — Backtest-Methodik, Risikoparameter, statistische Validierung. Keine Blackbox, keine unseriösen Versprechungen.',
      'about.v2.label':          'Disziplin',
      'about.v2.title':          'Regelbasiert ohne Ausnahme',
      'about.v2.desc':           'Scherbius 1.0 trifft keine diskretionären Entscheidungen. Das System folgt exakt definierten Regeln unabhängig von subjektiven Einflüssen, Nachrichten oder Emotionen.',
      'about.v3.label':          'Präzision',
      'about.v3.title':          'Statistisch verifiziert',
      'about.v3.desc':           'Alpha-Quellen werden statistisch auf Signifikanz geprüft. Nur Strategien mit nachgewiesenem, robusten Edge werden in das Portfolio aufgenommen.',
      'about.cta.label':         'Kontakt',
      'about.cta.title':         'Sprechen Sie mit uns',
      'about.cta.desc':          'Fragen zur Strategie, zu institutionellen Konditionen oder zum Privatanleger-Abo? Wir antworten schnell und persönlich.',
      'about.cta.btn1':          'Nachricht schreiben',
      'about.cta.btn2':          'Track Record ansehen',

      /* ── Contact ─────────────────────────────────────────── */
      'contact.label':           'Kontakt',
      'contact.sub.inst':        'Wir erläutern unsere Strategie, beantworten Ihre Fragen und besprechen individuelle Konditionen.',
      'contact.sub.retail':      'Für den 14-Tage-Testzugang oder allgemeine Fragen — wir antworten schnell und persönlich.',
      'contact.direct':          'Direktkontakt',
      'contact.inst.label':      'Institutionelle Anfragen',
      'contact.inst.desc':       'Persönliche Beratung, individuelle Konditionen und Due-Diligence-Unterlagen auf Anfrage. Wir melden uns innerhalb von 24 Stunden.',
      'contact.trial.label':     '14-Tage-Testzugang',
      'contact.trial.desc':      'Keine Kreditkartendaten. Kein automatisches Abonnement. Wählen Sie im Formular "14-Tage-Test anfragen".',
      'contact.resp.label':      'Antwortzeit',
      'contact.resp.desc':       'Werktags innerhalb von 24 Stunden. Sie erhalten eine Bestätigungsmail bei Eingang Ihrer Nachricht.',
      'contact.form.label':      'Nachricht senden',
      'contact.form.name.l':     'Name',
      'contact.form.name.ph':    'Vor- und Nachname',
      'contact.form.email.l':    'E-Mail-Adresse',
      'contact.form.company.l':  'Unternehmen',
      'contact.form.company.ph': 'Name Ihres Unternehmens',
      'contact.form.subject.l':  'Betreff',
      'contact.form.opt1':       'Allgemeine Anfrage',
      'contact.form.opt2':       'Institutionelle Anfrage',
      'contact.form.opt3':       'Privatanleger-Abonnement',
      'contact.form.opt4':       '14-Tage-Test anfragen',
      'contact.form.opt5':       'Fragen zur Performance',
      'contact.form.opt6':       'Sonstiges',
      'contact.form.msg.l':      'Nachricht',
      'contact.form.msg.ph':     'Ihre Nachricht an uns...',
      'contact.form.submit':     'Nachricht senden',
      'contact.form.note':       'Mit dem Absenden öffnet sich Ihr E-Mail-Programm. Ihre Daten werden ausschließlich zur Bearbeitung Ihrer Anfrage verwendet.',

      /* ── Pricing ─────────────────────────────────────────── */
      'pricing.label':           'Preise & Konditionen',
      'pricing.inst.tier':       'Institutionell',
      'pricing.inst.desc':       'Institutionelle Investoren werden persönlich betreut. Preise, Leistungsumfang und Konditionen werden individuell vereinbart. Bitte nehmen Sie Kontakt auf.',
      'pricing.inst.f1':         'Tägliche Portfolio-Updates (PDF) vor Marktöffnung',
      'pricing.inst.f2':         'Vollständige Strategie- und Backtest-Dokumentation',
      'pricing.inst.f3':         'Persönlicher Ansprechpartner',
      'pricing.inst.f4':         'Individuelle Konditionen nach Absprache',
      'pricing.inst.f5':         'Due-Diligence-Unterlagen auf Anfrage',
      'pricing.inst.f6':         'Institutionelle Onboarding-Unterstützung',
      'pricing.inst.cta':        'Kontakt aufnehmen',
      'pricing.ret.tier':        'Privatanleger — Abonnement',
      'pricing.ret.period':      ',99 / Monat',
      'pricing.ret.desc':        'Tägliche Portfolio-Updates mit klaren Handlungsempfehlungen. Monatlich kündbar.',
      'pricing.ret.f1':          'Tägliches Portfolio-Update (PDF) vor Marktöffnung',
      'pricing.ret.f2':          'Positionsgrößen, Signale und Risikoparameter',
      'pricing.ret.f3':          'Monatlicher Performancebericht',
      'pricing.ret.f4':          'Zugang zum öffentlichen Portfolio-Archiv',
      'pricing.ret.f5':          'E-Mail-Support',
      'pricing.ret.cta':         'Jetzt abonnieren',
      'pricing.trial.badge':     'Empfohlen',
      'pricing.trial.tier':      '14-Tage-Testzugang',
      'pricing.trial.period':    'für 14 Tage',
      'pricing.trial.desc':      'Keine Kreditkartendaten erforderlich. Kein automatisches Abonnement. Testen Sie vollständig risikofrei.',
      'pricing.trial.f1':        '14 Tage vollständiger Zugang',
      'pricing.trial.f2':        'Keine Zahlungsdaten erforderlich',
      'pricing.trial.f3':        'Kein automatisches Abonnement',
      'pricing.trial.f4':        'Nach Testzeitraum: €39,99 / Monat (nur bei Interesse)',
      'pricing.trial.cta':       'Kostenlos starten',
      'pricing.note':            'Keine Kreditkartendaten · Kein automatisches Abonnement · Monatlich kündbar',
      'pricing.compare.label':   'Leistungsvergleich',
      'pricing.faq.label':       'Häufige Fragen',
      'pricing.cta.label':       'Erste Schritte',
      'pricing.cta.title.inst':  'Kontakt aufnehmen',
      'pricing.cta.title.retail':'14 Tage kostenlos testen',
      'pricing.cta.desc.inst':   'Wir klären Fragen, erläutern unsere Strategie und besprechen individuelle Konditionen in einem persönlichen Gespräch.',
      'pricing.cta.desc.retail': 'Keine Kreditkartendaten. Kein automatisches Abonnement. Einfach anfragen und testen.',
      'pricing.cta.btn.inst':    'Kontakt aufnehmen',
      'pricing.cta.btn.retail':  'Kostenlos testen',
      'pricing.cta.track':       'Track Record ansehen',

      /* ── Methodik ────────────────────────────────────────── */
      'meth.hero.label':         'Scherbius Analytics — Arbeitsweise',
      'meth.hero.title':         'Methodik',
      'meth.hero.desc':          'Wie können wir so ein hohes Alpha generieren? — Statistik. Kein Geheimnis, keine Magie. Nur disziplinierte, datengetriebene Methodik. Entwickelt mit dem Ziel, messbare marktunabhängige Rendite zu erzielen.',
      'meth.core.label':         'Grundprinzip',
      'meth.2l.label':           'Zwei-Ebenen-Ansatz',
      'meth.road.label':         'Roadmap',
      'meth.road.desc':          'Scherbius 1.0 ist der Ausgangspunkt. Die gleiche Methodik — mehr Märkte, mehr Strategien, stärkere Diversifikation.',
      'meth.valid.label':        'Validierung',
      'meth.bias.label':         'Wissenschaftliche Integrität',
      'meth.data.label':         'Infrastruktur',
      'meth.data.title':         'Datenprovider',
      'meth.data.desc':          'Scherbius wurde ohne sündhaft teure Daten von Bloomberg oder Refinitiv gebaut. Alle notwendigen Informationen sind über zugängliche, qualitativ hochwertige Quellen verfügbar — und das Ergebnis spricht für sich.',
      'meth.honest.label':       'Ehrlichkeit',
      'meth.mind.label':         'Grundhaltung',
      'meth.auto.label':         'Automatisierung',
      'meth.cta.label':          'Nächster Schritt',
      'meth.cta.title':          'Performance im Detail ansehen',
      'meth.cta.desc':           'Überzeugen Sie sich von den statistischen Ergebnissen: Equity-Kurven, Jahresrenditen und vollständige Kennzahlen.',
      'meth.cta.btn1':           'Track Record ansehen',
      'meth.cta.btn2':           'Kontakt aufnehmen',

      /* ── Anleitung ───────────────────────────────────────── */
      'guide.hero.label':        'Mitgliederbereich',
      'guide.hero.title':        'Anleitung',

      /* ── Archive ─────────────────────────────────────────── */
      'archive.hero.label':      'Transparenz',
      'archive.hero.title':      'Portfolio-Archiv',

      /* ── Performance ─────────────────────────────────────── */
      'perf.hero.label':         'Quantitative Analyse',
      'perf.hero.title':         'Performance',
    },

    en: {
      /* ── Nav ─────────────────────────────────────────────── */
      'nav.methodik':            'Methodology',
      'nav.performance':         'Performance',
      'nav.anleitung':           'Guide',
      'nav.archiv':              'Archive',
      'nav.preise':              'Pricing',
      'nav.ueber':               'About',
      'nav.login':               'Login',
      'nav.register':            'Create Account',
      'nav.dashboard':           'Dashboard',
      'nav.kontakt':             'Contact',
      'mode.inst':               'Institutional',
      'mode.retail':             'Retail',
      'nav.hamburger':           'Open Menu',

      /* ── Footer ──────────────────────────────────────────── */
      'footer.tagline':          'Quantitative Portfolio Management.\nDaily. Precise. Disciplined.',
      'footer.col.nav':          'Navigation',
      'footer.col.res':          'Resources',
      'footer.col.contact':      'Contact',
      'footer.archiv':           'Portfolio Archive',
      'footer.risk':             'Risk Disclaimer',
      'footer.privacy':          'Privacy Policy',
      'footer.imprint':          'Legal Notice',
      'footer.privacy.short':    'Privacy',

      /* ── Index — Hero ────────────────────────────────────── */
      'hero.label':              'Scherbius Analytics — Quantitative Portfolio Management',
      'hero.title.main':         'Market-Independent',
      'hero.title.em':           'Excess Return',
      'hero.sub.inst':           'Multi-strategy portfolios. Statistically robust alpha.\nUncorrelated with equity and bond markets.',
      'hero.sub.retail':         'Risk management for retail investors.\nDaily updates. 14-day free trial.',
      'hero.cta.inst':           'Get in Touch',
      'hero.cta.retail':         'Start 14-Day Free Trial',
      'hero.cta.track':          'View Track Record',
      'hero.kpi.total':          'Total Return (net)',
      'hero.kpi.cagr':           'CAGR (net)',

      /* ── Index — Track Record ────────────────────────────── */
      'tr.label':                'Track Record',
      'tr.kpi.cagr':             'CAGR (net)',
      'tr.kpi.total':            'Total Return',
      'tr.kpi.endvalue':         'End Value (net)',
      'tr.chart.sub':            'Indexed to €10,000, Jan 2015 – Feb 2026 · Scroll/Pinch to Zoom',
      'tr.chart.reset':          'Reset Zoom',
      'tr.full':                 'Full Return Analysis',
      'tr.disclaimer':           'All figures are based on backtests (01/2015–12/2025) and live data from 15.12.2025. Institutional returns: net of transaction costs. Retail returns: net of transaction costs and taxes. Past performance is not a reliable indicator of future results.',
      'tr.disclaimer.link':      'Full Risk Disclaimer',

      /* ── Index — Fact Sheets ─────────────────────────────── */
      'fs.label':                'Product Documentation',
      'fs.title':                'Fact Sheets',
      'fs.allversions':          'All versions in archive →',
      'fs.inst.label':           'Scherbius Analytics Inst 1.0',
      'fs.inst.title':           'Fact Sheet — Institutional',
      'fs.inst.desc':            'Strategy, performance metrics and risk parameters · As of March 2026 · Version 1.0',
      'fs.retail.label':         'Scherbius Analytics Retail 1.1',
      'fs.retail.title':         'Fact Sheet — Retail',
      'fs.retail.desc':          'Strategy, performance metrics and certificate information · As of March 2026 · Version 1.1',
      'fs.download':             'Download PDF',

      /* ── Index — Solution (dark) ─────────────────────────── */
      'sol.label':               'The Method',
      'sol.c1.title':            'Uncorrelated Return Stream',
      'sol.c1.desc':             'We do not seek the best instrument, but a portfolio of many return sources that do not influence each other.',
      'sol.c2.title':            'Portfolio of Many Strategies',
      'sol.c2.desc':             'Each strategy has weaknesses, but diversified as a bundle they behave statistically robust and stable across all market regimes.',
      'sol.c3.title':            'Pure Alpha Through Diversification',
      'sol.c3.desc':             'Many uncorrelated strategies combined in a portfolio produce pure alpha, independent of market conditions.',
      'sol.2l.label':            'Two-Layer Approach',
      'sol.2l.l1':               'Layer 1',
      'sol.2l.l1.title':         '5 Strategies per Market',
      'sol.2l.l2':               'Layer 2',
      'sol.2l.l2.title':         'ML Entry Probability',
      'sol.2l.end':              'Output',
      'sol.2l.end.title':        'Market-Independent Portfolio',
      'sol.methodik':            'Full Methodology Documentation',

      /* ── About ───────────────────────────────────────────── */
      'about.hero.label':        'The Team',
      'about.hero.title':        'About Scherbius Analytics',
      'about.hero.desc':         'Scherbius Analytics was founded to make systematic alpha accessible to investors, regardless of whether markets are rising or falling.',
      'about.team.label':        'Founding Team',
      'about.team.title':        'The Team',
      'about.team.title.em':     'behind the Model',
      'about.fk.role':           'Founder & CEO',
      'about.fk.degree':         'M.Sc. Economics',
      'about.er.role':           'Co-Founder',
      'about.er.degree':         'B.Sc. Economics',
      'about.fr.role':           'Feel Good Manager',
      'about.fr.degree':         'Miniature Poodle',
      'about.origin.label':      'Origin',
      'about.mission.label':     'Mission',
      'about.mission.title':     'Systematic Alpha',
      'about.mission.title.em':  'for every Investor',
      'about.mission.desc':      'Institutional hedge funds have generated market-uncorrelated returns for decades — but access has been reserved for the few. Scherbius Analytics makes these methods transparent, documented and accessible.',
      'about.v1.label':          'Transparency',
      'about.v1.title':          'Full Documentation',
      'about.v1.desc':           'We document every aspect of our strategy — backtest methodology, risk parameters, statistical validation. No black box, no vague promises.',
      'about.v2.label':          'Discipline',
      'about.v2.title':          'Rule-Based Without Exception',
      'about.v2.desc':           'Scherbius 1.0 makes no discretionary decisions. The system follows precisely defined rules, independent of subjective influences, news or emotions.',
      'about.v3.label':          'Precision',
      'about.v3.title':          'Statistically Verified',
      'about.v3.desc':           'Alpha sources are statistically tested for significance. Only strategies with a proven, robust edge are included in the portfolio.',
      'about.cta.label':         'Contact',
      'about.cta.title':         'Get in Touch',
      'about.cta.desc':          'Questions about strategy, institutional terms or the retail subscription? We respond quickly and personally.',
      'about.cta.btn1':          'Send a Message',
      'about.cta.btn2':          'View Track Record',

      /* ── Contact ─────────────────────────────────────────── */
      'contact.label':           'Contact',
      'contact.sub.inst':        'We explain our strategy, answer your questions and discuss individual terms.',
      'contact.sub.retail':      'For the 14-day trial or general questions — we respond quickly and personally.',
      'contact.direct':          'Direct Contact',
      'contact.inst.label':      'Institutional Enquiries',
      'contact.inst.desc':       'Personal consultation, individual terms and due diligence documents on request. We respond within 24 hours.',
      'contact.trial.label':     '14-Day Trial Access',
      'contact.trial.desc':      'No credit card required. No automatic subscription. Select "Request 14-day trial" in the form.',
      'contact.resp.label':      'Response Time',
      'contact.resp.desc':       'Within 24 hours on business days. You will receive a confirmation email upon receipt of your message.',
      'contact.form.label':      'Send Message',
      'contact.form.name.l':     'Name',
      'contact.form.name.ph':    'First and Last Name',
      'contact.form.email.l':    'Email Address',
      'contact.form.company.l':  'Company',
      'contact.form.company.ph': 'Your Company Name',
      'contact.form.subject.l':  'Subject',
      'contact.form.opt1':       'General Enquiry',
      'contact.form.opt2':       'Institutional Enquiry',
      'contact.form.opt3':       'Retail Subscription',
      'contact.form.opt4':       'Request 14-Day Trial',
      'contact.form.opt5':       'Performance Questions',
      'contact.form.opt6':       'Other',
      'contact.form.msg.l':      'Message',
      'contact.form.msg.ph':     'Your message to us...',
      'contact.form.submit':     'Send Message',
      'contact.form.note':       'Clicking send will open your email client. Your data is used solely to process your enquiry.',

      /* ── Pricing ─────────────────────────────────────────── */
      'pricing.label':           'Pricing & Terms',
      'pricing.inst.tier':       'Institutional',
      'pricing.inst.desc':       'Institutional investors receive personal service. Pricing, scope and terms are agreed individually. Please get in touch.',
      'pricing.inst.f1':         'Daily portfolio updates (PDF) before market open',
      'pricing.inst.f2':         'Full strategy and backtest documentation',
      'pricing.inst.f3':         'Personal point of contact',
      'pricing.inst.f4':         'Individual terms by arrangement',
      'pricing.inst.f5':         'Due diligence documents on request',
      'pricing.inst.f6':         'Institutional onboarding support',
      'pricing.inst.cta':        'Get in Touch',
      'pricing.ret.tier':        'Retail — Subscription',
      'pricing.ret.period':      '.99 / month',
      'pricing.ret.desc':        'Daily portfolio updates with clear action recommendations. Cancel monthly.',
      'pricing.ret.f1':          'Daily portfolio update (PDF) before market open',
      'pricing.ret.f2':          'Position sizes, signals and risk parameters',
      'pricing.ret.f3':          'Monthly performance report',
      'pricing.ret.f4':          'Access to public portfolio archive',
      'pricing.ret.f5':          'Email support',
      'pricing.ret.cta':         'Subscribe Now',
      'pricing.trial.badge':     'Recommended',
      'pricing.trial.tier':      '14-Day Trial',
      'pricing.trial.period':    'for 14 days',
      'pricing.trial.desc':      'No credit card required. No automatic subscription. Try completely risk-free.',
      'pricing.trial.f1':        '14 days full access',
      'pricing.trial.f2':        'No payment details required',
      'pricing.trial.f3':        'No automatic subscription',
      'pricing.trial.f4':        'After trial: €39.99/month (only if interested)',
      'pricing.trial.cta':       'Start for Free',
      'pricing.note':            'No credit card · No automatic subscription · Cancel monthly',
      'pricing.compare.label':   'Service Comparison',
      'pricing.faq.label':       'Frequently Asked Questions',
      'pricing.cta.label':       'Get Started',
      'pricing.cta.title.inst':  'Get in Touch',
      'pricing.cta.title.retail':'14 Days Free Trial',
      'pricing.cta.desc.inst':   'We answer questions, explain our strategy and discuss individual terms in a personal conversation.',
      'pricing.cta.desc.retail': 'No credit card. No automatic subscription. Simply enquire and test.',
      'pricing.cta.btn.inst':    'Get in Touch',
      'pricing.cta.btn.retail':  'Try for Free',
      'pricing.cta.track':       'View Track Record',

      /* ── Methodik ────────────────────────────────────────── */
      'meth.hero.label':         'Scherbius Analytics — How We Work',
      'meth.hero.title':         'Methodology',
      'meth.hero.desc':          'How can we generate such high alpha? — Statistics. No secret, no magic. Just disciplined, data-driven methodology. Developed with the goal of generating measurable market-independent returns.',
      'meth.core.label':         'Core Principle',
      'meth.2l.label':           'Two-Layer Approach',
      'meth.road.label':         'Roadmap',
      'meth.road.desc':          'Scherbius 1.0 is the starting point. The same methodology — more markets, more strategies, stronger diversification.',
      'meth.valid.label':        'Validation',
      'meth.bias.label':         'Scientific Integrity',
      'meth.data.label':         'Infrastructure',
      'meth.data.title':         'Data Providers',
      'meth.data.desc':          'Scherbius was built without the expensive data of Bloomberg or Refinitiv. All necessary information is available through accessible, high-quality sources — and the results speak for themselves.',
      'meth.honest.label':       'Honesty',
      'meth.mind.label':         'Core Mindset',
      'meth.auto.label':         'Automation',
      'meth.cta.label':          'Next Step',
      'meth.cta.title':          'View Performance in Detail',
      'meth.cta.desc':           'See the statistical results for yourself: equity curves, annual returns and full metrics.',
      'meth.cta.btn1':           'View Track Record',
      'meth.cta.btn2':           'Get in Touch',

      /* ── Anleitung ───────────────────────────────────────── */
      'guide.hero.label':        'Members Area',
      'guide.hero.title':        'Guide',

      /* ── Archive ─────────────────────────────────────────── */
      'archive.hero.label':      'Transparency',
      'archive.hero.title':      'Portfolio Archive',

      /* ── Performance ─────────────────────────────────────── */
      'perf.hero.label':         'Quantitative Analysis',
      'perf.hero.title':         'Performance',
    }
  },

  /* ─────────────────────────────────────────────────────────
     init — call once on DOMContentLoaded
  ───────────────────────────────────────────────────────── */
  init() {
    const stored = localStorage.getItem(this.LANG_KEY);
    this.lang = stored || 'de';
    this._apply(this.lang);
    document.querySelectorAll('[data-lang-btn]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.langBtn;
        if (t !== this.lang) this._apply(t);
      });
    });
  },

  /* ─────────────────────────────────────────────────────────
     _apply — swap all translated text
  ───────────────────────────────────────────────────────── */
  _apply(lang) {
    this.lang = lang;
    localStorage.setItem(this.LANG_KEY, lang);
    document.documentElement.setAttribute('data-lang', lang);
    document.documentElement.lang = lang;

    const d = this.dict[lang];
    if (!d) return;

    // textContent replacements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const v = d[el.dataset.i18n];
      if (v !== undefined) el.textContent = v;
    });

    // innerHTML replacements (for tags with <br>/<em> inside)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const v = d[el.dataset.i18nHtml];
      if (v !== undefined) el.innerHTML = v;
    });

    // placeholder replacements
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const v = d[el.dataset.i18nPh];
      if (v !== undefined) el.setAttribute('placeholder', v);
    });

    // aria-label replacements
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const v = d[el.dataset.i18nAria];
      if (v !== undefined) el.setAttribute('aria-label', v);
    });

    // update lang-btn active state
    document.querySelectorAll('[data-lang-btn]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.langBtn === lang);
    });

    // update <title>
    const tk = document.documentElement.dataset.i18nTitle;
    if (tk && d[tk]) document.title = d[tk];
  }
};
