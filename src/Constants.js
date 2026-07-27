// src/Constants.js

const API_BASE = 'https://api.shamcash.sy/v4';
const BANK_BASE = 'https://bank.shamcash.sy/v4';
const PAYMENT_BASE = 'https://payment.shamcash.com/v4';

const RSA_PUBLIC_KEY = `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEAuj8jcVjIoCND5p0ZIDMcNkPV3YzF3zywvB0az6Vorb+VHeAlUHut
WNRMmyVr3Eu+pPx27v+V7V60Nq9j5QSTeHXC4ndMuHrRUDc8IEhDcbOFdPEwrA6Q
UH+K1d8VQUcXOHPRcx0xEDtNwW8dKP6ySI3tt61HWp+/s133+OIAUKyH5BmWmauj
tJWaRfxwVA3okvwHMgWRfK0Nyxe6yFnmO4izOqKt/Pph0uPZVXL4/JawC5lvuwbk
SMuPGJjRN34YuMje1mkvArHTSeJ7dplqG6rXIg1X75m1elFu4GiLCc76SqgQBmXW
KSe5sprj2OrooP5B/liFD0LnsuVBWRarFQIDAQAB
-----END RSA PUBLIC KEY-----`;

const STATIC_AES_KEY = "g0Zrgp8XRK/BN2ZAtUfJDQ==";

module.exports = {
    API_BASE,
    BANK_BASE,
    PAYMENT_BASE,
    RSA_PUBLIC_KEY,
    STATIC_AES_KEY
};