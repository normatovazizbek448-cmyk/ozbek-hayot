/* In-game legal framework inspired by general constitutional principles. Not legal advice. */
const PRINCIPLES=[
 {id:'equality',title:'Tenglik',text:'O‘yin ichidagi shahar xizmatlari va qoidalari o‘yinchilarga teng qo‘llanadi.'},
 {id:'property',title:'Mulk huquqi',text:'Uy, transport va biznes egaligi serverdagi tranzaksiya yozuvlari bilan himoyalanadi.'},
 {id:'contract',title:'Shartnoma va kelishuv',text:'Ijara, savdo va xizmatlar oldindan ko‘rsatilgan narx va muddat asosida yuritiladi.'},
 {id:'privacy',title:'Shaxsiy ma’lumotlar',text:'Profil ma’lumotlari ruxsatsiz oshkor qilinmasligi uchun server cheklovlari qo‘llanadi.'},
 {id:'election',title:'Saylov',text:'Shahar prezidenti lavozimi faqat o‘yin ichidagi fuqarolik/saylov mexanikasi orqali beriladi.'},
 {id:'dueprocess',title:'Adolatli ko‘rib chiqish',text:'Biznes va hisob bo‘yicha nizolar uchun o‘yin ichida shikoyat va moderator ko‘rib chiqishi bo‘lishi kerak.'},
 {id:'freedom',title:'Fikr va tanlov erkinligi',text:'O‘yinchilar qonuniy o‘yin qoidalari doirasida faoliyat, kasb va biznes yo‘nalishini tanlaydi.'},
 {id:'budget',title:'Jamoat budjeti',text:'Shahar budjeti soliq va xizmatlardan tushgan o‘yin ichidagi UZS mablag‘lari sifatida yuritiladi.'}
];
function list(){return PRINCIPLES.slice();}
module.exports={list,officialSource:'https://lex.uz/ru/actinfo/respondents/-6445145'};
