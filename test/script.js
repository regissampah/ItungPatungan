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
  document.getEl
