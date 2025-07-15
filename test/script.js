async function uploadToGemini(event) {
  const file = event.target.files[0];
  if (!file) return;

  const preview = document.getElementById("preview");
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';

  const base64 = await toBase64(file);
  const geminiPayload = {
    contents: [{
      parts: [
        { inlineData: { mimeType: file.type, data: base64 } },
        { text: "Dari gambar struk ini, ekstrak hanya daftar item dan harganya. Kembalikan dalam format JSON array murni tanpa teks tambahan. Pastikan harga dalam format ribuan rupiah (contoh: 40500 untuk empat puluh ribu lima ratus). Contoh: [{\"name\":\"Nasi Goreng\",\"price\":15000,\"quantity\":2}]" }
      ]
    }]
  };

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCC7Mo1KbGwxvhagbpRBmJghxnFall1ca8", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiPayload)
  });

  const json = await res.json();
  console.log("Gemini raw response:", json);

  let text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    alert("Respon kosong dari Gemini.");
    return;
  }

  if (text.startsWith("```")) {
    text = text.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
  }

  try {
    const items = JSON.parse(text);
    const form = document.getElementById("form");
    form.innerHTML = '';
    items.forEach(({name, price, quantity}) => {
      if (price < 1000) price *= 1000;
      tambahItem(name, price, quantity || 1);
    });
    hitungSubtotal();
  } catch (e) {
    console.error("Gagal parsing JSON:", text, e);
    alert("Gagal parsing hasil Gemini. Lihat console untuk detail.");
  }
}

function tambahItem(name = '', price = '', quantity = 1) {
  const form = document.getElementById("form");
  const row = document.createElement('div');
  row.className = 'item';
  row.innerHTML = `
    <input type="text" value="${name}" class="menu" oninput="hitungSubtotal()">
    <input type="number" value="${price}" class="harga" oninput="hitungSubtotal()">
    <input type="number" value="${quantity}" class="jumlah" min="1" title="Jumlah" oninput="hitungSubtotal()">
    <button class="remove" onclick="this.parentElement.remove(); hitungSubtotal()">×</button>
  `;
  form.appendChild(row);
}

function tambahItemManual() {
  tambahItem('', '', 1);
}

function resetForm() {
  document.getElementById("form").innerHTML = '';
  document.getElementById("totalBayar").value = '';
  document.getElementById("result").innerHTML = '';
  document.getElementById("subtotal").innerHTML = '';
  document.getElementById("preview").style.display = 'none';
  document.getElementById("preview").src = '';
  document.getElementById("waShare").style.display = 'none';
  document.getElementById("resetButton").style.display = 'none';
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
}

function hitungSubtotal() {
  const hargaEls = document.querySelectorAll(".harga");
  const jumlahEls = document.querySelectorAll(".jumlah");
  let subtotal = 0;
  hargaEls.forEach((el, i) => {
    const harga = parseFloat(el.value) || 0;
    const jumlah = parseInt(jumlahEls[i].value) || 1;
    subtotal += harga * jumlah;
  });
  document.getElementById("subtotal").innerHTML = `<p><strong>Total Harga Item:</strong> Rp ${subtotal.toLocaleString('id-ID')}</p>`;
}

function hitungPatungan() {
  const hargaEls = document.querySelectorAll(".harga");
  const menuEls = document.querySelectorAll(".menu");
  const jumlahEls = document.querySelectorAll(".jumlah");
  const totalInput = parseFloat(document.getElementById("totalBayar").value);
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "";

  if (!totalInput || totalInput <= 0) {
    resultDiv.innerHTML = "<p style='color:red;'>Masukkan total bayar yang valid!</p>";
    return;
  }

  let itemList = [];
  let totalAsli = 0;

  hargaEls.forEach((el, i) => {
    const nama = menuEls[i].value || `Item ${i+1}`;
    const harga = parseFloat(el.value) || 0;
    const jumlah = parseInt(jumlahEls[i].value) || 1;
    totalAsli += harga * jumlah;
    itemList.push({ nama, harga, jumlah });
  });

  let hasil = "<h3>Hasil Patungan:</h3>";
  let totalHitung = 0;
  let waText = "*Hasil Patungan:*\n";

  itemList.forEach((item, i) => {
    const proporsi = (item.harga * item.jumlah) / totalAsli;
    const bayar = (i === itemList.length - 1)
      ? Math.round(totalInput - totalHitung)
      : Math.round(proporsi * totalInput);
    totalHitung += bayar;

    const perOrang = item.jumlah > 1 ? ` → @Rp ${Math.round(bayar / item.jumlah).toLocaleString('id-ID')}` : '';
    hasil += `<p>${item.nama} (x${item.jumlah}): Rp ${bayar.toLocaleString('id-ID')}${perOrang}</p>`;
    waText += `• ${item.nama} (x${item.jumlah}): Rp ${bayar.toLocaleString('id-ID')}${perOrang}\n`;
  });

  hasil += `<hr><p><strong>Total Patungan:</strong> Rp ${totalHitung.toLocaleString('id-ID')}</p>`;
  waText += `\nTotal Patungan: Rp ${totalHitung.toLocaleString('id-ID')}`;

  resultDiv.innerHTML = hasil;
  const waLink = document.getElementById("waShare");
  waLink.href = `https://wa.me/?text=${encodeURIComponent(waText)}`;
  waLink.style.display = 'inline-block';
  document.getElementById("resetButton").style.display = 'inline-block';
}
