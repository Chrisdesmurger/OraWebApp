# 🌐 Guide d'installation - Auto-Traduction Google Translate

**Date**: 2025-12-24
**Feature**: Bouton "Auto-Translate" dans le portail admin
**Status**: ✅ Code Ready - Configuration Required

---

## 📋 Vue d'ensemble

Ce guide explique comment activer la fonctionnalité d'**auto-traduction automatique** dans le portail admin OraWebApp. Les utilisateurs pourront traduire instantanément les lessons et programmes du français vers l'anglais et l'espagnol en un clic.

### Fonctionnalités

- ✅ **Bouton "Auto-Translate"** à côté de chaque champ multilingue
- ✅ Traduction automatique **FR → EN + ES** via Google Translate API
- ✅ Animation de chargement pendant la traduction
- ✅ Notifications toast (succès/erreur)
- ✅ Prévisualisation immédiate des traductions
- ✅ Possibilité d'éditer les traductions après génération

---

## 🚀 Installation

### Étape 1: Activer Google Cloud Translation API

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet **ora-wellbeing**
3. Allez dans **APIs & Services** → **Library**
4. Recherchez **"Cloud Translation API"**
5. Cliquez sur **"Enable"**

### Étape 2: Créer une clé API

1. Dans Google Cloud Console, allez dans **APIs & Services** → **Credentials**
2. Cliquez sur **"Create Credentials"** → **"API Key"**
3. Copiez la clé générée (format : `AIza...`)
4. **IMPORTANT**: Restreignez la clé pour la sécurité :
   - Cliquez sur "Edit API key"
   - **Application restrictions**: HTTP referrers (websites)
     - Ajoutez : `https://yourdomain.com/*` (votre domaine de production)
     - Ajoutez : `http://localhost:3000/*` (pour développement)
   - **API restrictions**: Restrict key
     - Sélectionnez uniquement : **Cloud Translation API**
   - Sauvegardez

### Étape 3: Configurer la variable d'environnement

1. Ouvrez le fichier `.env.local` dans OraWebApp :

```bash
cd /c/Users/chris/source/repos/OraWebApp
code .env.local
```

2. Ajoutez la clé API :

```env
# Google Translate API
GOOGLE_TRANSLATE_API_KEY=AIzaSyA...VotreCléIci
```

3. **Ne committez JAMAIS ce fichier !** Vérifiez que `.env.local` est dans `.gitignore`

### Étape 4: Redémarrer le serveur de développement

```bash
cd /c/Users/chris/source/repos/OraWebApp
npm run dev
```

---

## 🎨 Utilisation du composant

### Option A: Utiliser le nouveau composant (Recommandé)

Remplacez l'import dans vos fichiers :

**Avant** (`EditLessonDialog.tsx`, `CreateLessonDialog.tsx`, etc.):
```typescript
import { TranslationFields } from '@/components/ui/translation-fields';
```

**Après**:
```typescript
import { TranslationFields } from '@/components/ui/translation-fields-with-auto-translate';
```

Le composant fonctionne exactement pareil, mais avec le bouton "Auto-Translate" en plus !

### Option B: Mettre à jour le composant existant

Alternativement, vous pouvez remplacer le contenu de `components/ui/translation-fields.tsx` par le contenu de `translation-fields-with-auto-translate.tsx`.

---

## 📝 Fichiers créés

1. **API Route** ✅
   - `/app/api/translate/route.ts`
   - Endpoint POST qui appelle Google Translate API
   - Gère l'authentification Firebase
   - Retourne les traductions EN + ES

2. **Composant UI amélioré** ✅
   - `/components/ui/translation-fields-with-auto-translate.tsx`
   - Version améliorée de `TranslationFields`
   - Bouton "Auto-Translate" avec icône 🌐
   - Loading state avec spinner
   - Toast notifications

---

## 🧪 Test

### Test manuel

1. Ouvrez le portail admin : http://localhost:3000/admin/content
2. Cliquez sur "Edit" pour un lesson existant
3. Dans le champ **Title**:
   - Onglet FR : Entrez "Méditation du matin"
   - Cliquez sur le bouton **"🌐 Auto-Translate"**
   - Vérifiez que les onglets EN et ES se remplissent automatiquement
   - Onglet EN : Devrait afficher "Morning meditation"
   - Onglet ES : Devrait afficher "Meditación matutina"

### Vérification

- ✅ Le bouton "Auto-Translate" apparaît uniquement si le texte FR est rempli
- ✅ Un spinner "Translating..." s'affiche pendant la traduction
- ✅ Une notification verte apparaît en cas de succès
- ✅ Une notification rouge apparaît en cas d'erreur
- ✅ L'onglet bascule automatiquement sur EN après la traduction

---

## 🔒 Sécurité

### Production

**IMPORTANT**: En production, utilisez **Firebase App Check** ou **Cloud Endpoints** au lieu d'une simple clé API :

1. **Option 1: Firebase App Check** (Recommandé)
   - Protège l'API avec reCAPTCHA
   - Configure dans Firebase Console → App Check

2. **Option 2: Cloud Endpoints**
   - Proxy sécurisé pour Google Translate API
   - Meilleur contrôle des quotas

3. **Option 3: Backend proxy**
   - Appelez Google Translate depuis Firebase Functions
   - La clé API reste côté serveur

### Quotas Google Translate

**Gratuit** :
- 500,000 caractères/mois

**Payant** :
- $20 USD par million de caractères

Surveillez votre usage : https://console.cloud.google.com/apis/api/translate.googleapis.com/quotas

---

## 🎯 Workflow utilisateur

### Scénario 1: Nouveau lesson

1. Admin crée un nouveau lesson
2. Remplit le titre en français : "Yoga pour débutants"
3. Clique sur "🌐 Auto-Translate"
4. ✅ EN: "Yoga for beginners"
5. ✅ ES: "Yoga para principiantes"
6. Vérifie/corrige si nécessaire
7. Sauvegarde

### Scénario 2: Lesson existant

1. Admin ouvre un lesson avec `[TO TRANSLATE]` dans les champs EN/ES
2. Clique sur "🌐 Auto-Translate" pour le titre
3. Clique sur "🌐 Auto-Translate" pour la description
4. Révise les traductions générées
5. Apporte des corrections manuelles si nécessaire
6. Sauvegarde

---

## 🐛 Dépannage

### Erreur: "Translation service not configured"

**Cause**: La variable `GOOGLE_TRANSLATE_API_KEY` n'est pas définie

**Solution**:
1. Vérifiez `.env.local`
2. Redémarrez le serveur de développement
3. Vérifiez les logs serveur dans le terminal

### Erreur: "Unauthorized"

**Cause**: L'utilisateur n'est pas authentifié

**Solution**:
- Vérifiez que vous êtes connecté au portail admin
- Rafraîchissez la page et reconnectez-vous

### Erreur: "Translation failed for en"

**Cause**: Quota dépassé ou clé API invalide

**Solution**:
1. Vérifiez que la clé API est correcte
2. Vérifiez les quotas dans Google Cloud Console
3. Vérifiez que l'API Cloud Translation est activée

### Les traductions sont de mauvaise qualité

**Solution**:
- Google Translate peut être imprécis pour certains termes techniques
- Utilisez le bouton "Auto-Translate" comme **point de départ**
- **Relisez et corrigez** toujours les traductions avant de sauvegarder
- Pour du contenu professionnel, faites appel à un traducteur natif

---

## 📊 Métriques de traduction

Pour suivre l'utilisation :

```typescript
// Dans /app/api/translate/route.ts, ajoutez :
console.log(`[Translate] User: ${userId}, Characters: ${text.length}, Langs: ${targetLangs.join(',')}`);
```

---

## 🚀 Prochaines améliorations

### Phase 1 (Actuel)
- [x] Bouton Auto-Translate basique
- [x] Traduction FR → EN + ES
- [x] Notifications toast
- [ ] Configurer GOOGLE_TRANSLATE_API_KEY
- [ ] Tester en production

### Phase 2 (Futur)
- [ ] **Cache des traductions** (éviter de traduire 2 fois le même texte)
- [ ] **Détection automatique de langue** (si le champ FR est en anglais)
- [ ] **Traduction batch** (traduire tous les champs d'un formulaire en 1 clic)
- [ ] **Support DeepL API** (meilleure qualité que Google Translate)
- [ ] **Historique des traductions** (rollback si mauvaise traduction)
- [ ] **Suggestions de traductions** (based on similar content)

### Phase 3 (Avancé)
- [ ] **Machine Learning** : Apprendre des corrections manuelles
- [ ] **Glossaire personnalisé** : Termes spécifiques au bien-être
- [ ] **Validation communautaire** : Upvote/downvote des traductions
- [ ] **Export/Import** : Traduire via fichiers CSV

---

## 📞 Support

**Développeur**: Claude (Anthropic)
**Date**: 2025-12-24
**Version**: 1.0.0

**Documentation API**:
- [Google Cloud Translation API](https://cloud.google.com/translate/docs)
- [Pricing](https://cloud.google.com/translate/pricing)
- [Quotas](https://cloud.google.com/translate/quotas)

---

## ✅ Checklist de déploiement

### Développement
- [x] API route `/api/translate` créée
- [x] Composant `TranslationFields` avec auto-translate créé
- [ ] Variable `GOOGLE_TRANSLATE_API_KEY` configurée dans `.env.local`
- [ ] Serveur de développement redémarré
- [ ] Test manuel effectué (traduire un lesson)

### Production
- [ ] Google Cloud Translation API activée
- [ ] Clé API créée avec restrictions (domaine + API)
- [ ] Variable `GOOGLE_TRANSLATE_API_KEY` ajoutée à Vercel/Hosting
- [ ] Déployé et testé en production
- [ ] Quotas configurés et surveillés
- [ ] Firebase App Check activé (sécurité)

---

**Note**: Cette fonctionnalité nécessite une **clé API Google Cloud Translation** active. Sans cette clé, le bouton "Auto-Translate" affichera une erreur "Translation service not configured".
