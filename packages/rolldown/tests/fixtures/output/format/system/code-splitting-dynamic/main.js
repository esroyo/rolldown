const id = Math.random() < 0.5 ? 1 : 2;
import(`./lazy-${id}.js`).then((m) => console.log(m.value));
