const goals = [
  'Kapıdaki tabelaya bak ve E ile kafeyi aç.',
  'Bir bilgisayar kasasına bak ve E ile bilgisayarı aç.',
  'Resepsiyona E ile otur. Bilgisayarı aç, Yönetim’e gir ve ilk müşteriyi onayla.',
  'Seans bitince Yönetim ekranından ödemeyi al.',
];

export function createWalkthrough(savedProgress) {
  let step = savedProgress?.walkthrough ?? (savedProgress ? null : 0);

  return {
    get step() { return step; },
    get goal() { return goals[step] ?? ''; },
    toggle() { step = step === null ? 0 : null; },
    update(state) {
      if (step === 0 && state.open) step = 1;
      if (step === 1 && state.stations.some(station => station.powered)) step = 2;
    },
    admitCustomer() {
      if (step === 2) step = 3;
    },
    collectPayment() {
      if (step === 3) step = null;
    },
  };
}
