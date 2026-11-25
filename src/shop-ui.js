import { catalog } from './shop.js';

const shippingLabels = {
  preparing: 'Hazırlanıyor', transit: 'Dağıtımda', delivered: 'Teslim noktasında',
  carried: 'Elinde', installed: 'Kuruldu', parked: 'Kafenin önüne teslim edildi',
};
export function shippingText(order) {
  const remaining = order.left > 0 ? ` · ${Math.ceil(order.left)} sn kaldı` : '';
  return shippingLabels[order.phase] + remaining;
}

export function createShopUi({ shop, state, money, button, summaryCard, sound, renderApp, renderPhone, syncHud }) {
  let shopPage = 'catalog';
  let shopMessage = '';

  function renderShop(body) {
    const toolbar = document.createElement('nav');
    toolbar.className = 'arcade-toolbar';
    for (const [page,label] of [['catalog','Ürünler'],['basket',`Sepet (${shop.basket.reduce((n,[,q])=>n+q,0)})`],['orders','Siparişler']]) {
      toolbar.append(button(label, shopPage === page ? 'primary' : 'secondary', () => {
        shopPage = page;
        shopMessage = '';
        renderApp();
      }));
    }
    body.append(toolbar);
    if (shopMessage) body.append(summaryCard(shopMessage,''));
    if (shopPage === 'basket' || shopPage === 'checkout') {
      renderCheckout(body);
      return;
    }
    if (shopPage === 'catalog') {
      for (const [kind, item] of Object.entries(catalog)) {
        const line = document.createElement('div');
        line.className = 'shop-line';
        const product = document.createElement('div');
        product.className = 'product-tile';
        const art = document.createElement('span');
        art.className = 'product-art';
        art.textContent = item.icon;
        art.setAttribute('aria-hidden', 'true');
        product.append(art, summaryCard(item.name, item.description));
        line.append(product);
        if (kind === 'car') line.classList.add('car-product');
        const buy = button(kind === 'car' && !shop.canAdd(kind) ? (shop.carOrder ? 'Satın alındı' : 'Sepette') : `${money.format(item.price)} TL · Sepete ekle`, 'primary', () => {
          if (shop.add(kind)) renderApp();
        });
        buy.disabled = !shop.canAdd(kind);
        line.append(buy);
        body.append(line);
      }
      return;
    }
    const heading = document.createElement('h3');
    heading.textContent = 'Siparişler ve kargo';
    body.append(heading);
    if (!shop.orders.length) body.append(summaryCard('Sipariş yok', 'Kargolar girişe yakın Kargo Teslim noktasına bırakılır.'));
    for (const order of shop.orders) {
      const line = document.createElement('div');
      line.className = 'shop-line';
      const name = document.createElement('strong');
      name.textContent = `#${order.id} · ${catalog[order.kind].name}`;
      const progress = document.createElement('output');
      progress.id = `shipping-${order.id}`;
      progress.textContent = shippingText(order);
      line.append(name, progress);
      body.append(line);
    }
  }

  function renderCheckout(body) {
    if (!shop.basket.length) {
      body.append(summaryCard('Sepet boş','Ürünler bölümünden bir ürün ekle.'));
      return;
    }
    for (const [kind,quantity] of shop.basket) {
      const row = summaryCard(`${catalog[kind].icon} ${catalog[kind].name} × ${quantity}`,
        `${money.format(catalog[kind].price * quantity)} TL`);
      if (shopPage === 'basket') row.append(button('Bir adet çıkar','secondary',() => {
        shop.remove(kind);
        renderApp();
      }));
      body.append(row);
    }
    body.append(summaryCard(`Toplam · ${money.format(shop.total)} TL`,''));
    if (shopPage === 'basket') {
      body.append(button('Ödemeye geç','primary',() => {
        shopPage = 'checkout';
        renderApp();
      }));
      return;
    }
    const card = summaryCard('Kart bilgileri',shop.linked ? 'YSOL Banka · •••• 0417' :
      shop.pending ? 'Telefonundaki Banka bildirimini onayla.' : 'Ödeme için oyun içi banka kartını bağla.');
    if (!shop.linked) {
      const link = button(shop.pending ? 'Onay bekleniyor' : 'Bankanı bağla','primary',() => {
        if (!shop.requestLink()) return;
        sound.play('delivery');
        renderApp();
      });
      link.disabled = shop.pending;
      card.append(link);
    }
    const pay = button('Ödemeyi tamamla','primary',() => {
      if (!shop.checkout()) return;
      sound.play('cash');
      shopPage = 'orders';
      shopMessage = 'Ödeme tamamlandı';
      syncHud();
      renderApp();
    });
    pay.disabled = !shop.linked || state.cash < shop.total;
    if (state.cash < shop.total) card.append(summaryCard('Yetersiz bakiye','Sepeti düzenleyebilir veya daha sonra ödeyebilirsin.'));
    body.append(card,pay);
  }

  function renderBank(body) {
    body.append(summaryCard('YSOL Banka',`Kullanılabilir bakiye · ${money.format(state.cash)} TL`));
    body.append(summaryCard('Oyun içi banka kartı · •••• 0417',shop.linked ? 'Zamazingo’ya bağlı' : 'Zamazingo’ya bağlı değil'));
    if (shop.pending) {
      const request = summaryCard('Zamazingo bağlantı isteği','Kartını bağlamak için bu bildirimi onayla.');
      request.append(button('Bağlantıyı onayla','primary',() => { shop.approveLink(); renderPhone(); }));
      request.append(button('Reddet','secondary',() => { shop.unlink(); renderPhone(); }));
      body.append(request);
    } else {
      body.append(button(shop.linked ? 'Zamazingo’dan kartı çıkar' : 'Kartı Zamazingo’ya bağla',
        shop.linked ? 'secondary' : 'primary',() => {
          if (shop.linked) shop.unlink();
          else shop.linkFromBank();
          renderPhone();
        }));
    }
  }

  return { renderShop, renderBank };
}
