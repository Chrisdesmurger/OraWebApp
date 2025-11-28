# 🚀 Quick Start Guide - Ora Admin Web Interface

## ⚠️ Important: Résolution des Problèmes de Build

Si vous rencontrez des erreurs `EPERM` ou des problèmes de permissions avec le dossier `.next`:

### Solution 1: Fermer les processus Node

```bash
# Windows - PowerShell (en tant qu'administrateur)
Get-Process node | Stop-Process -Force

# Puis nettoyez
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules
```

### Solution 2: Redémarrer votre terminal

1. Fermez tous les terminaux/VS Code
2. Réouvrez
3. Réessayez

## 📦 Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Copier les variables d'environnement
cp .env.example .env

# 3. Éditer .env et ajouter vos credentials Firebase
# Voir docs/SETUP_FIREBASE.md pour les instructions détaillées
```

## 🔧 Configuration Minimale

Ajoutez au minimum ces variables dans `.env`:

```bash
# Firebase Client (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin (Secret - JSON sur une seule ligne)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

## 🚀 Démarrage

```bash
# Démarrer le serveur de développement
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## ✅ Checklist Première Installation

- [ ] Node.js 18+ installé
- [ ] Firebase project créé
- [ ] `npm install` exécuté
- [ ] `.env` configuré avec les credentials Firebase
- [ ] Firebase rules déployées (`firebase deploy --only firestore:rules,storage:rules`)
- [ ] Premier utilisateur admin créé (voir docs/SETUP_FIREBASE.md étape 8)

## 🐛 Dépannage Rapide

### Erreur: "EPERM: operation not permitted"

**Cause**: Un processus Node bloque le dossier `.next`

**Solution**:
```powershell
# Windows PowerShell (admin)
Get-Process node | Stop-Process -Force
Remove-Item -Recurse -Force .next
npm run dev
```

### Erreur: "Firebase initialization failed"

**Cause**: Variables d'environnement manquantes ou incorrectes

**Solution**:
1. Vérifiez que `.env` existe et contient toutes les variables
2. Vérifiez que `FIREBASE_SERVICE_ACCOUNT_JSON` est sur **une seule ligne** (pas de retours à la ligne)
3. Redémarrez le serveur

### Erreur: "Module not found"

**Cause**: Dépendances manquantes

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Erreur: Build timeout ou très lent

**Cause**: Trop de fichiers dans `node_modules` ou problèmes de cache

**Solution**:
```bash
# Nettoyer le cache Next.js
rm -rf .next

# Build avec plus de mémoire
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

## 📚 Documentation Complète

- [README.md](README.md) - Guide complet du projet
- [docs/SETUP_FIREBASE.md](docs/SETUP_FIREBASE.md) - Configuration Firebase détaillée
- [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md) - Guide de déploiement Vercel
- [PROJECT_COMPLETION_REPORT.md](PROJECT_COMPLETION_REPORT.md) - Rapport détaillé du projet

## 🆘 Support

Si les problèmes persistent:

1. Vérifiez que vous utilisez Node.js 18+ : `node --version`
2. Vérifiez que npm est à jour : `npm --version` (devrait être 9+)
3. Consultez la documentation complète dans `/docs`
4. Vérifiez que tous les fichiers sont bien présents (87+ fichiers créés)

## 🎯 Prochaines Étapes

Une fois le serveur lancé:

1. Allez sur `/login`
2. Connectez-vous avec votre admin user
3. Explorez le dashboard `/admin`
4. Testez les fonctionnalités (users, content, programs, commands)
5. Consultez les analytics `/admin/stats`

---

**Bon développement !** 🚀
