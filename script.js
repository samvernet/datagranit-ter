const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyVcpBmxBxS-TWrnzxXI1qV3FxvTzUomXcO6Uq5TJq5UPxUOpxKjv8OdTLC5HujczvF/exec';

let allData = [];
let map = null;

async function init() {
    try {
        const response = await fetch(SCRIPT_URL);
        allData = await response.json();
        document.getElementById('resultsCount').textContent = allData.length + " enregistrements trouvés";
        render(allData);
    } catch (e) { document.getElementById('resultsCount').textContent = "Erreur de synchronisation"; }
}

function getCleanImgUrl(url) {
    if (!url) return null;
    if (url.startsWith('data:image')) return url;
    if (url.length > 500) return `data:image/jpeg;base64,${url}`;
    if (url.includes('drive.google.com')) {
        const fileId = url.split('/d/')[1]?.split('/')[0] || url.split('id=')[1];
        return `https://docs.google.com/uc?export=view&id=${fileId}`;
    }
    return url;
}

function render(data) {
    const grid = document.getElementById('resultsGrid');
    grid.innerHTML = data.map((item, index) => `
        <div class="card" onclick="showFiche(${index})">
            <h3>${item['prénom nom'] || (item.Prénom + ' ' + item.Nom)}</h3>
            <p><i class="fas fa-calendar-alt"></i> ${item['Date de naissance'] || '-'}</p>
            <div class="status-pill">${item.Etat || 'fiche disponible'}</div>
        </div>
    `).join('');
}

function showFiche(index) {
    const item = window.currentFiltered ? window.currentFiltered[index] : allData[index];
    const lat = parseFloat(item.Lat || item.X);
    const lng = parseFloat(item.Long || item.Y);

    document.getElementById('modalData').innerHTML = `
        <div class="info-row"><i class="fas fa-user"></i><div><label>Identité du défunt</label><span>${item['prénom nom'] || (item.Prénom + ' ' + item.Nom)}</span></div></div>
        <div class="info-row"><i class="fas fa-history"></i><div><label>Naissance & Décès</label><span>${item['Date de naissance'] || '?'} <br> ${item['Date de décés'] || '?'}</span></div></div>
        <div class="info-row"><i class="fas fa-map-marked-alt"></i><div><label>Localisation</label><span>Secteur ${item.Section || '-'} / N° ${item.Numéro || '-'}</span></div></div>
        <div class="info-row"><i class="fas fa-clock"></i><div><label>Échéance Concession</label><span style="color:#ef4444;">${item['Date de renouvellement'] || 'Non spécifiée'}</span></div></div>
        <div class="info-row"><i class="fas fa-monument"></i><div><label>État de la stèle</label><span>${item['Etat de la stèle'] || 'Non renseigné'}</span></div></div>
        <div class="info-row"><i class="fas fa-crosshair"></i><div><label>Précision GPS</label><span style="font-family:monospace;">${lat || 'N/A'}, ${lng || 'N/A'}</span></div></div>
    `;

    const photoUrl = getCleanImgUrl(item['Url photo stèle']);
    document.getElementById('modalPhoto').innerHTML = photoUrl ? `<img src="${photoUrl}">` : `<div style="height:100px; background:#f8fafc; border-radius:20px; display:flex; align-items:center; justify-content:center; color:#cbd5e1;"><i class="fas fa-camera-slash"></i></div>`;

    document.getElementById('detailModal').style.display = "block";

    setTimeout(() => {
        if (map) { map.remove(); map = null; }
        if (!isNaN(lat) && !isNaN(lng)) {
            map = L.map('map').setView([lat, lng], 19);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            L.marker([lat, lng]).addTo(map);
            map.invalidateSize();
        }
    }, 450);
}

document.querySelector('.close-btn').onclick = () => { document.getElementById('detailModal').style.display = "none"; };
window.onclick = (e) => { if (e.target == document.getElementById('detailModal')) { document.getElementById('detailModal').style.display = "none"; } };

document.getElementById('searchForm').onsubmit = (e) => {
    e.preventDefault();
    const q = document.getElementById('searchInput').value.toLowerCase();
    const l = document.getElementById('locationInput').value.toLowerCase();
    const s = document.getElementById('statusSelect').value;
    const filtered = allData.filter(i => {
        const n = (i['prénom nom'] || "").toLowerCase();
        const loc = (i['Ville de naissance'] || "").toLowerCase();
        const stat = i.Etat || "";
        return n.includes(q) && loc.includes(l) && (!s || stat === s);
    });
    window.currentFiltered = filtered;
    render(filtered);
    document.getElementById('resultsCount').textContent = filtered.length + " enregistrements trouvés";
};

init();