/* ===============================
 GRANITE.io — script.js
 =============================== */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyVcpBmxBxS-TWrnzxXI1qV3FxvTzUomXcO6Uq5TJq5UPxUOpxKjv8OdTLC5HujczvF/exec';

let allData = [];
let map = null;

/* ========== HELPERS GÉNÉRAUX ========== */

function normalizeText(str) {
  if (!str) return '';
  return str.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/['’\-_.]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getFullName(item) {
  if (item['prénom nom']) return item['prénom nom'];
  if (item['Prénom nom']) return item['Prénom nom'];
  if (item.Prénom && item.Nom) return `${item.Prénom} ${item.Nom}`;
  return item.Nom || '—';
}

// Fonction de nettoyage d'image ultra-robuste
function getCleanImgUrl(url) {
  if (!url) return null;
  
  const u = url.toString().trim().replace(/&amp;/g, '&');

  // Extraction de l'ID Google Drive
  const driveRegex = /[-\w]{25,}/; 
  const match = u.match(driveRegex);
  
  if (match && u.includes('drive.google.com')) {
    const fileId = match[0];
    // Ce lien est souvent beaucoup plus stable que le lien "uc"
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  
  return u;
}

function getEtatStele(item) {
  return item['Etat de la stèle'] ?? item['État de la stèle'] ?? item['Etat stèle'] ?? item['État stèle'] ?? null;
}

/* ========== INITIALISATION ========== */
async function init() {
  try {
    const response = await fetch(SCRIPT_URL);
    allData = await response.json();
    document.getElementById('resultsCount').textContent = allData.length + ' enregistrements trouvés';
    render(allData);
  } catch (e) {
    console.error(e);
    document.getElementById('resultsCount').textContent = 'Erreur de synchronisation';
  }
}

/* ========== RENDU LISTE ========== */
function render(data) {
  const grid = document.getElementById('resultsGrid');
  grid.innerHTML = data.map((item, index) => {
    const badge = getEtatStele(item) ?? item.Etat ?? item['État'] ?? '—';
    return `
      <div class="card" onclick="showFiche(${index})">
        <h3>${getFullName(item)}</h3>
        <p>${item['Date de naissance'] ?? item['Naissance'] ?? '—'}</p>
        <span class="status-pill">${badge}</span>
      </div>`;
  }).join('');
}

/* ========== FICHE (MODALE) ========== */
window.showFiche = function (index) {
  // Gestion de l'index selon si on a filtré ou non
  const item = window.currentFiltered ? window.currentFiltered[index] : allData[index];

  const lat = parseFloat(item.Lat ?? item.X);
  const lng = parseFloat(item.Long ?? item.Y);
  const fullName = getFullName(item);

  // Mise à jour des textes de la fiche
  document.getElementById('ficheNom').textContent = fullName;
  document.getElementById('modalData').innerHTML = `
    <div class="info-row"><i class="fas fa-user"></i><div><label>Identité</label><span>${fullName}</span></div></div>
    <div class="info-row"><i class="fas fa-history"></i><div><label>Naissance & Décès</label><span>${item['Date de naissance'] ?? '—'}<br>${item['Date de décès'] ?? '—'}</span></div></div>
    <div class="info-row"><i class="fas fa-location-dot"></i><div><label>Localisation</label><span>Secteur ${item.Section ?? '—'} / N° ${item.Numéro ?? '—'}</span></div></div>
    <div class="info-row"><i class="fas fa-calendar"></i><div><label>Échéance</label><span>${item['Date de renouvellement'] ?? 'Non spécifiée'}</span></div></div>
    <div class="info-row"><i class="fas fa-monument"></i><div><label>État stèle</label><span>${getEtatStele(item) ?? 'Non renseigné'}</span></div></div>
  `;

  /* ========== AFFICHAGE PHOTO ========== */
  // On cherche l'URL dans les colonnes possibles
  const rawUrl = item['Url photo stèle'] || item['Url photo stele'] || item['Photo'] || item['photo'];
  const photoUrl = getCleanImgUrl(rawUrl);
  const box = document.getElementById('modalPhoto');
  
  box.innerHTML = ''; // Nettoyage avant injection

  if (photoUrl) {
    const img = document.createElement('img');
    img.src = photoUrl;
    img.style.width = "100%";
    img.style.borderRadius = "20px";
    img.style.display = "block";
    img.style.marginBottom = "15px";
    
    // Si l'image bloque encore (droits Drive), on affiche un message
    img.onerror = () => {
      box.innerHTML = '<p style="color:#64748b; font-size:0.8rem; padding:20px; border:1px dashed #ccc; border-radius:20px;">Lien valide mais image inaccessible. Vérifiez que le dossier Drive est bien en accès "Tous les utilisateurs disposant du lien".</p>';
    };
    box.appendChild(img);
  } else {
    box.innerHTML = '<p style="color:#64748b; font-size:0.8rem; padding:20px;">Aucune photo disponible pour cette fiche.</p>';
  }

  /* ========== CARTE ========== */
  document.getElementById('detailModal').style.display = 'block';
  setTimeout(() => {
    if (map) map.remove();
    if (!isNaN(lat) && !isNaN(lng)) {
      map = L.map('map').setView([lat, lng], 19);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      L.marker([lat, lng]).addTo(map);
      map.invalidateSize();
    }
  }, 350);
};

/* ========== RECHERCHE & EVENEMENTS ========== */
document.addEventListener('DOMContentLoaded', () => {
  // Fermeture modale
  document.querySelector('.close-btn').onclick = () => document.getElementById('detailModal').style.display = 'none';
  window.onclick = (e) => { if (e.target === document.getElementById('detailModal')) document.getElementById('detailModal').style.display = 'none'; };

  // Formulaire de recherche
  document.getElementById('searchForm').onsubmit = (e) => {
    e.preventDefault();
    const q = normalizeText(document.getElementById('searchInput').value);
    
    const filtered = allData.filter(i => {
      const name = normalizeText(getFullName(i));
      return name.includes(q);
    });

    window.currentFiltered = filtered;
    render(filtered);
    document.getElementById('resultsCount').textContent = filtered.length + ' enregistrements trouvés';
  };

  // Recherche en temps réel
  document.getElementById('searchInput').addEventListener('input', () => {
     document.getElementById('searchForm').dispatchEvent(new Event('submit'));
  });

  init();
});