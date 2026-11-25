const drinkCoffee = ['C', 'İçmek için C’ye bas'];
const cancelMove = ['G', 'Taşımayı iptal et'];
const installComputer = ['E', 'Uygun masaya kur'];
const rotatePackage = ['R', 'Yerleştirmeden önce döndür'];

export function createActionHint(element) {
  const key = element.querySelector('kbd');
  const label = element.querySelector('span');
  let current = null;

  return function update({ coffee, movingFurniture, packageKind }) {
    const action = coffee ? drinkCoffee
      : movingFurniture ? cancelMove
      : packageKind === 'pc' ? installComputer
      : packageKind ? rotatePackage
      : null;
    if (action === current) return;
    current = action;
    element.hidden = !action;
    if (action) {
      const [shortcut, text] = action;
      key.textContent = shortcut;
      label.textContent = text;
    }
  };
}
