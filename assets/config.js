/* Wartości demonstracyjne, nie cennik AVELNORY. Jedyny plik konfiguracji klienta. */
window.AVELNORY_CONFIG = {
  FORM_ENDPOINT: '', // np. https://formspree.io/f/ID lub https://api.web3forms.com/submit
  FORM_PROVIDER: 'formspree', // formspree | web3forms | generic
  FORM_FORMAT: 'json', // json | formdata
  WEB3FORMS_ACCESS_KEY: '', // publiczny klucz formularza, nigdy klucz prywatnego API
  CONTACT_EMAIL: 'kontakt@avelnory.com',
  REQUEST_TIMEOUT_MS: 12000,
  QUEUE_TTL_DAYS: 7,
  TEST_MODE: false, // true tylko do testów: zgłoszenie dostaje testowe: 1 i [TEST] w temacie
  cars: { small: {label:'Małe', factor:1}, medium:{label:'Średnie',factor:1.15}, suv:{label:'SUV',factor:1.35}, van:{label:'Van',factor:1.5} },
  conditions: { new:{label:'Prawie jak nowy',factor:1}, normal:{label:'Normalnie używany',factor:1.15}, worn:{label:'Mocno zmatowiały / porysowany',factor:1.4} },
  services: {
    correction1:{label:'Korekta lakieru — 1 etap',min:650,max:950,hours:[8,12],paint:true},
    correction2:{label:'Korekta lakieru — 2 etapy',min:1100,max:1700,hours:[16,24],paint:true},
    ceramic1:{label:'Ceramika — 1 rok',min:700,max:1000,hours:[8,12],paint:true},
    ceramic3:{label:'Ceramika — 3 lata',min:1300,max:1900,hours:[12,18],paint:true},
    ceramic5:{label:'Ceramika — 5 lat',min:1900,max:2700,hours:[16,24],paint:true},
    ppfFront:{label:'PPF — przód',min:4000,max:6000,hours:[16,24],paint:true},
    ppfFull:{label:'PPF — całość',min:12000,max:18000,hours:[40,64],paint:true},
    upholstery:{label:'Pranie tapicerki',min:300,max:500,hours:[4,8],paint:false},
    interior:{label:'Detailing wnętrza',min:450,max:750,hours:[6,10],paint:false}
  }
};
