const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'mcu_full.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Dicionário de substituições precisas
const replacements = {
  "?ltimo": "último", "?ndia": "Índia", "?nica": "única", "?nicos": "únicos", "?pica": "épica",
  "?rbita": "órbita", "?rvore": "árvore", "?tica": "ótica", "A??o": "Ação", "A?rea": "Aérea",
  "Admir?vel": "Admirável", "Afeganist?o": "Afeganistão", "Algu?m": "Alguém", "Am?rica": "América",
  "An?is": "Anéis", "Anima??o": "Animação", "Ap?s": "Após", "Ap?tridas": "Apátridas",
  "C?o": "Cão", "Ca?adora": "Caçadora", "Cabe?a": "Cabeça", "Capit?o": "Capitão", "Com?dia": "Comédia",
  "Document?rio": "Documentário", "Falc?o": "Falcão", "Fam?lia": "Família", "Fant?stico": "Fantástico",
  "Fic??o": "Ficção", "For?a": "Força", "Gal?xia": "Galáxia", "Garc?a": "García", "Gavi?o": "Gavião",
  "Guardi?es": "Guardiões", "Incr?vel": "Incrível", "M?nica": "Mônica", "Mej?a": "Mejía",
  "P?s": "Pós", "Por?m": "Porém", "Qu?ntico": "Quântico", "Salda?a": "Saldaña", "Skarsg?rd": "Skarsgård",
  "T?Challa": "T'Challa", "Trov?o": "Trovão", "Valqu?ria": "Valquíria", "Vari?ncia": "Variância",
  "Vi?va": "Viúva", "Vis?o": "Visão", "a??es": "ações", "advers?rio": "adversário", "ag?ncia": "agência",
  "al?m": "além", "algu?m": "alguém", "alian?a": "aliança", "alien?gena": "alienígena", "am?vel": "amável",
  "amaldi?oa": "amaldiçoa", "amea?a": "ameaça", "amea?as": "ameaças", "an?mala": "anômala",
  "an?malas": "anômalas", "ap?s": "após", "ap?tico": "apático", "apari??o": "aparição", "atr?s": "atrás",
  "bilion?rio": "bilionário", "c?o": "cão", "c?smica": "cósmica", "c?smico": "cósmico", "ca?a": "caça",
  "ca?ada": "caçada", "ca?adores": "caçadores", "catacl?smico": "cataclísmico", "catastr?ficos": "catastróficos",
  "cen?rio": "cenário", "cient?fica": "científica", "cirurgi?o": "cirurgião", "col?gio": "colégio",
  "colis?o": "colisão", "come?a": "começa", "competi??o": "competição", "complica??es": "complicações",
  "conclu?da": "concluída", "confedera??o": "confederação", "consequ?ncias": "consequências",
  "conspira??o": "conspiração", "constr?i": "constrói", "coroa??o": "coroação", "crian?a": "criança",
  "decis?o": "decisão", "destr?i": "destrói", "destro?os": "destroços", "destru?da": "destruída",
  "destrui??o": "destruição", "det?m": "detém", "dom?nio": "domínio", "dur?es": "durões",
  "enigm?tica": "enigmática", "enigm?tico": "enigmático", "ent?o": "então", "entrela?am": "entrelaçam",
  "equil?brio": "equilíbrio", "esfor?o": "esforço", "esfor?os": "esforços", "esperan?a": "esperança",
  "est?pidas": "estúpidas", "ex?rcito": "exército", "exist?ncia": "existência", "extin??o": "extinção",
  "f?cil": "fácil", "f?rmula": "fórmula", "fa?a": "faça", "fam?lia": "família", "flex?vel": "flexível",
  "for?a": "força", "for?ada": "forçada", "for?am": "forçam", "for?ar": "forçar", "for?as": "forças",
  "g?nio": "gênio", "gal?ctico": "galáctico", "h?bil": "hábil", "her?i": "herói", "her?is": "heróis",
  "hist?ria": "história", "human?ide": "humanóide", "implac?vel": "implacável", "improv?vel": "improvável",
  "incalcul?veis": "incalculáveis", "incr?veis": "incríveis", "inesquec?vel": "inesquecível",
  "informa??es": "informações", "inigual?vel": "inigualável", "inquieta??o": "inquietação",
  "inspira??o": "inspiração", "instala??es": "instalações", "intelig?ncia": "inteligência",
  "inten??o": "intenção", "interfer?ncia": "interferência", "intergal?ctica": "intergaláctica",
  "intergal?tico": "intergaláctico", "inv?s": "invés", "invas?o": "invasão", "irm?o": "irmão",
  "l?der": "líder", "la?os": "laços", "laborat?rio": "laboratório", "ladr?o": "ladrão",
  "lan?ados": "lançados", "m?dia": "mídia", "m?e": "mãe", "m?gicas": "mágicas", "m?gico": "mágico",
  "m?os": "mãos", "m?quina": "máquina", "m?scara": "máscara", "m?sticos": "místicos",
  "magn?tico": "magnético", "mal?fica": "maléfica", "mant?m": "mantém", "mem?rias": "memórias",
  "mercen?rio": "mercenário", "miss?o": "missão", "mist?rio": "mistério", "mist?rios": "mistérios",
  "mudar?o": "mudarão", "n?o": "não", "n?rdicos": "nórdicos", "na??o": "nação", "obriga??es": "obrigações",
  "organiza??o": "organização", "p?e": "põe", "p?r": "pôr", "pa?s": "país", "paci?ncia": "paciência",
  "pal?cio": "palácio", "pap?is": "papéis", "persegui??o": "perseguição", "pol?ticos": "políticos",
  "por?m": "porém", "pr?ncipe": "príncipe", "pr?prios": "próprios", "precisar?o": "precisarão",
  "preocupa??es": "preocupações", "presen?a": "presença", "press?o": "pressão", "problem?tica": "problemática",
  "prop?sito": "propósito", "propens?o": "propensão", "prote??o": "proteção", "puni??o": "punição",
  "purgat?rio": "purgatório", "r?pido": "rápido", "ra?a": "raça", "radia??o": "radiação",
  "re?ne": "reúne", "re?nem": "reúnem", "rec?m": "recém", "ref?gio": "refúgio", "rel?quia": "relíquia",
  "rela??es": "relações", "revolucion?rio": "revolucionário", "ru?nas": "ruínas", "s?mbolo": "símbolo",
  "s?o": "são", "s?rie": "série", "s?ries": "séries", "sa?rem": "saírem", "sacrif?cios": "sacrifícios",
  "sat?lites": "satélites", "ser?o": "serão", "solit?ria": "solitária", "superexposi??o": "superexposição",
  "t?o": "tão", "tamb?m": "também", "ter?o": "terão", "terr?vel": "terrível", "territ?rio": "território",
  "tr?s": "três", "trag?dia": "tragédia", "trai?oeiro": "traiçoeiro", "v?o": "vão", "v?rias": "várias",
  "v?rios": "vários", "vers?es": "versões", "vil?es": "vilões", "vil?o": "vilão", "vingan?a": "vingança",
  
  // Novas palavras encontradas
  "rob? ": "robô ",
  "rob?.": "robô.",
  "rob?,": "robô,",
  "Capit? ": "Capitã ",
  "Capit? Marvel": "Capitã Marvel",
  "Tit? ": "Titã ",
  "vil? ": "vilã ",
  "vil?.": "vilã.",
  "vil?,": "vilã,",
  "Brichc?n": "Brichcán",
  "A? ": "Aí ",
  "us?-las": "usá-las",
  "captur?-lo": "capturá-lo",
  "herdar? ": "herdará ",
  "ser? ": "será ",
  " ? ": " é ",
  "v? ": "vê ",
  "v?.": "vê.",
  "v?,": "vê,",

  // Palavras curtas ou pontas soltas comuns (com espaço ou pontuação)
  " est? ": " está ", " Est? ": " Está ", " est?": " está",
  " j? ": " já ", " J? ": " Já ", " j?": " já",
  " h? ": " há ", " H? ": " Há ", " h?": " há",
  " s? ": " só ", " S? ": " Só ", " s?": " só",
  " at? ": " até ", " At? ": " Até ", " at?": " até",
  " voc? ": " você ", " Voc? ": " Você ", " voc?": " você",
  " voc?s ": " vocês ", " Voc?s ": " Vocês ", " voc?s": " vocês",
  " ir? ": " irá ", " Ir? ": " Irá ", " ir?": " irá",
  " a? ": " aí ", " A? ": " Aí ", " a?": " aí",
  
  // Reparos de duplas de ?
  "a??": "açã",
  "A??": "Açã",
  "i??": "içã",
  "I??": "Içã",
  "e??": "eçã",
  "E??": "Eçã",
  "o??": "oçã",
  "O??": "Oçã",
  "u??": "uçã",
  "U??": "Uçã"
};

function convertDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return dateStr;
}

function fixText(text) {
  if (!text || typeof text !== 'string') return text;
  let newText = text;
  
  for (const [bad, good] of Object.entries(replacements)) {
    // Escapar o ?
    const regex = new RegExp(bad.replace(/\?/g, '\\?'), 'g');
    newText = newText.replace(regex, good);
  }
  return newText;
}

function traverse(obj) {
  if (Array.isArray(obj)) {
    obj.forEach(traverse);
  } else if (obj !== null && typeof obj === 'object') {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        if (key === 'release_date' || key === 'releaseDate' || key === 'releasedate') {
          obj[key] = convertDate(obj[key]);
        } else {
          obj[key] = fixText(obj[key]);
        }
      } else if (typeof obj[key] === 'object') {
        traverse(obj[key]);
      }
    }
  }
}

traverse(data);

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
console.log('Finalizado com sucesso!');
