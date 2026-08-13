/* =============================================================
   Site-wide language switcher — English / Kiswahili.
   Served once from the server and injected into every page (see
   server.js), same pattern as app-shell.css. Translates any element
   tagged data-i18n="key" (textContent) or data-i18n-placeholder="key"
   (input placeholder) using the dictionaries below, and wires up the
   #langSwitcher <select> the server injects into the banner on every
   page — no per-page markup needed.

   Coverage note: this translates the main navigation, section
   headings, and primary buttons/labels across the homepage, member
   dashboard, and admin portal — the highest-visibility text. Content
   generated dynamically from live data (table rows, admin list
   items, etc.) stays in the language it was entered in, since that's
   real parish data, not static UI text.
============================================================= */
(function () {
    'use strict';

    var DICTIONARY = {
        nav_brand: {
            en: '✝ St. Michael Kasaini Youth',
            sw: '✝ Vijana wa Mtakatifu Michael Kasaini'
        },
        nav_brand_admin: {
            en: 'St. Michael Admin Portal',
            sw: 'Tovuti ya Usimamizi ya Mtakatifu Michael'
        },
        nav_brand_dashboard: {
            en: '✝ St. Michael Kasaini Youth Portal',
            sw: '✝ Tovuti ya Vijana ya Mtakatifu Michael Kasaini'
        },
        nav_jumuiya: { en: 'Jumuiya Portal', sw: 'Tovuti ya Jumuiya' },
        nav_signin: { en: 'Sign In', sw: 'Ingia' },
        nav_signup: { en: 'Sign Up', sw: 'Jisajili' },
        nav_signout: { en: 'Sign Out', sw: 'Toka' },
        nav_profile_tab: { en: 'Profile Tab', sw: 'Wasifu Wangu' },

        hero_title: {
            en: 'St. Michael Kasaini Youth Portal',
            sw: 'Tovuti ya Vijana ya Mtakatifu Michael Kasaini'
        },
        hero_subtitle: { en: 'Pilgrims of Hope.', sw: 'Mahujaji wa Matumaini.' },
        hero_jumuiya_btn: { en: 'Jumuiya Portal', sw: 'Tovuti ya Jumuiya' },
        hero_member_btn: { en: 'Member Portal', sw: 'Tovuti ya Wanachama' },

        readings_heading: {
            en: 'Sunday Holy Mass Readings & Updates',
            sw: 'Masomo ya Misa Takatifu ya Jumapili na Matangazo'
        },
        reading_first: { en: 'First Reading', sw: 'Somo la Kwanza' },
        reading_psalm: { en: 'Responsorial Psalm', sw: 'Zaburi ya Kujibu' },
        reading_second: { en: 'Second Reading', sw: 'Somo la Pili' },
        reading_gospel: { en: 'Gospel', sw: 'Injili' },

        reflection_heading: {
            en: '📖 Daily Spiritual Reflection',
            sw: '📖 Tafakari ya Kiroho ya Kila Siku'
        },

        sanctuary_heading: {
            en: '🕯️ Virtual Prayer Sanctuary',
            sw: '🕯️ Patakatifu pa Sala Pepe'
        },
        sanctuary_sub: {
            en: 'Tap a candle to light it for a prayer intention, or tap again to let it rest.',
            sw: 'Gusa mshumaa ili kuuwasha kwa nia ya sala, au ugute tena ili kuuzima.'
        },

        hymnal_heading: {
            en: '🎵 Tumshangilie Bwana — Parish Hymnal',
            sw: '🎵 Tumshangilie Bwana — Kitabu cha Nyimbo cha Parokia'
        },
        hymnal_sub: {
            en: 'Tap a title below to open the full song or prayer.',
            sw: 'Gusa jina lililo hapo chini ili kufungua wimbo au sala kamili.'
        },

        prayers_heading: {
            en: 'Catholic Church Prayers (Mass & Home)',
            sw: 'Sala za Kanisa Katoliki (Misa na Nyumbani)'
        },
        rosary_heading: {
            en: 'The Holy Rosary: Complete Guide & Mysteries',
            sw: 'Rozari Takatifu: Mwongozo Kamili na Mafumbo'
        },
        stations_heading: {
            en: 'The Way of the Cross (Stations 1 to 14)',
            sw: 'Njia ya Msalaba (Vituo 1 hadi 14)'
        },
        resources_heading: {
            en: '✝️ Catholic Resources & Guides',
            sw: '✝️ Rasilimali na Miongozo ya Kikatoliki'
        },
        contacts_heading: {
            en: '📞 Youth Board Contacts',
            sw: '📞 Mawasiliano ya Bodi ya Vijana'
        },
        footer_text: {
            en: '© 2026 St. Michael Kasaini Youth Portal. All rights reserved.',
            sw: '© 2026 Tovuti ya Vijana ya Mtakatifu Michael Kasaini. Haki zote zimehifadhiwa.'
        },

        profile_heading: { en: 'My Profile Settings', sw: 'Mipangilio ya Wasifu Wangu' },
        profile_name: { en: 'Full Name', sw: 'Jina Kamili' },
        profile_group: { en: 'Group', sw: 'Kikundi' },
        profile_password: { en: 'New Password (leave blank to keep current)', sw: 'Nenosiri Jipya (acha tupu ili kutumia lililopo)' },
        profile_save: { en: 'Save Profile Changes', sw: 'Hifadhi Mabadiliko' },

        updates_heading: { en: '📢 Community Updates & Announcements', sw: '📢 Habari na Matangazo ya Jamii' },
        patron_heading: {
            en: '🛡️ Our Patron Saint: St. Aloysius Gonzaga',
            sw: '🛡️ Mtakatifu Mlinzi Wetu: Mtakatifu Aloysius Gonzaga'
        },
        saint_of_day_heading: { en: '🖼️ Saint of the Day', sw: '🖼️ Mtakatifu wa Leo' },
        globe_heading: { en: '🌍 Global Prayer Globe', sw: '🌍 Dunia ya Sala Kimataifa' },
        light_intention_btn: { en: '✨ Light a prayer intention from here', sw: '✨ Washa nia ya sala kutoka hapa' },
        chapel_heading: { en: '🕯️ Virtual Basilica Chapel', sw: '🕯️ Kanisa la Kidijitali la Basilika' },
        enter_chapel_btn: { en: 'Enter Virtual Chapel', sw: 'Ingia Kanisa la Kidijitali' },

        events_heading: { en: '📅 Upcoming Youth Events', sw: '📅 Matukio Yajayo ya Vijana' },
        contributions_chart_heading: { en: '📊 Contributions Overview by Jumuiya', sw: '📊 Muhtasari wa Michango kwa Jumuiya' },
        contributions_list_heading: { en: '💰 Official Approved Contributions List', sw: '💰 Orodha Rasmi ya Michango Iliyoidhinishwa' },
        directory_heading: { en: 'Official Youth Directory & Members', sw: 'Orodha Rasmi ya Vijana na Wanachama' },
        board_heading: { en: 'Youth Community Board & Queries', sw: 'Ubao wa Jamii ya Vijana na Maswali' },
        message_placeholder: { en: 'Type a message or query for leaders...', sw: 'Andika ujumbe au swali kwa viongozi...' },
        post_message_btn: { en: 'Post Message', sw: 'Tuma Ujumbe' },

        private_messages_heading: { en: '🔒 My Private Messages with Admin', sw: '🔒 Ujumbe Wangu wa Faragha na Msimamizi' },
        private_message_placeholder: { en: 'Type a private message to the admin...', sw: 'Andika ujumbe wa faragha kwa msimamizi...' },

        companion_title: { en: 'St. Michael Companion', sw: 'Msaidizi wa Mtakatifu Michael' },
        companion_sub: { en: 'Ask about events, readings, mentors, contacts...', sw: 'Uliza kuhusu matukio, masomo, walezi, mawasiliano...' },
        companion_placeholder: { en: 'Type your question...', sw: 'Andika swali lako...' },
        send_btn: { en: 'Send', sw: 'Tuma' },

        admin_login_heading: { en: 'Admin Portal Login', sw: 'Kuingia Tovuti ya Usimamizi' },
        admin_username: { en: 'Username', sw: 'Jina la Mtumiaji' },
        admin_password: { en: 'Password', sw: 'Nenosiri' },
        admin_login_btn: { en: 'Login to Dashboard', sw: 'Ingia kwenye Dashibodi' },
        admin_dashboard_overview: { en: 'Dashboard Overview', sw: 'Muhtasari wa Dashibodi' },
        admin_download_report: { en: 'Download Report', sw: 'Pakua Ripoti' },
        admin_set_targets: { en: 'Set Targets', sw: 'Weka Malengo' },
        admin_refresh: { en: 'Refresh', sw: 'Onyesha Upya' },
        admin_total_collected: { en: 'Total Collected', sw: 'Jumla Iliyokusanywa' },
        admin_total_target: { en: 'Total Target', sw: 'Jumla ya Lengo' }
    };

    var LANG_KEY = 'site_lang';

    function getSavedLanguage() {
        try {
            var saved = localStorage.getItem(LANG_KEY);
            if (saved === 'kam' || !saved) return 'en';
            return saved;
        } catch (e) { return 'en'; }
    }

    function applyLanguage(lang) {
        if (lang !== 'sw') lang = 'en';
        var key, entry, el, i;
        document.documentElement.setAttribute('lang', lang);

        var textEls = document.querySelectorAll('[data-i18n]');
        for (i = 0; i < textEls.length; i++) {
            el = textEls[i];
            key = el.getAttribute('data-i18n');
            entry = DICTIONARY[key];
            if (entry) {
                el.textContent = entry[lang] || entry.en;
            }
        }

        var placeholderEls = document.querySelectorAll('[data-i18n-placeholder]');
        for (i = 0; i < placeholderEls.length; i++) {
            el = placeholderEls[i];
            key = el.getAttribute('data-i18n-placeholder');
            entry = DICTIONARY[key];
            if (entry) {
                el.setAttribute('placeholder', entry[lang] || entry.en);
            }
        }

        var switcher = document.getElementById('langSwitcher');
        if (switcher && switcher.value !== lang) switcher.value = lang;
    }

    function setLanguage(lang) {
        try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* storage unavailable; still apply for this load */ }
        applyLanguage(lang);
    }

    function wireSwitcher() {
        var switcher = document.getElementById('langSwitcher');
        if (!switcher) return;
        switcher.addEventListener('change', function () { setLanguage(switcher.value); });
    }

    function init() {
        wireSwitcher();
        applyLanguage(getSavedLanguage());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
