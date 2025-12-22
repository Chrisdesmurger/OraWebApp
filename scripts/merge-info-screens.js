const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function mergeInfoScreens() {
  try {
    const docRef = db.collection('onboarding_configs').doc('personalization-v1');
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log('Document not found');
      process.exit(1);
    }

    const data = doc.data();

    if (!data.informationScreens || data.informationScreens.length < 2) {
      console.log('Not enough information screens to merge');
      process.exit(1);
    }

    // Create merged screen combining screen 0 and screen 1
    const mergedScreen = {
      order: -2,
      position: 0,
      title: "Bienvenue sur ORA",
      titleFr: "Bienvenue sur ORA",
      titleEn: "Welcome to ORA",
      titleEs: "Bienvenido a ORA",
      subtitle: "2 minutes pour personnaliser ton expérience et découvrir un parcours conçu juste pour toi.",
      subtitleFr: "2 minutes pour personnaliser ton expérience et découvrir un parcours conçu juste pour toi.",
      subtitleEn: "2 minutes to personalize your experience and discover a journey designed just for you.",
      subtitleEs: "2 minutos para personalizar tu experiencia y descubrir un recorrido diseñado solo para ti.",
      features: [
        {
          icon: "✨",
          title: "Questions simples et adaptées",
          titleFr: "Questions simples et adaptées",
          titleEn: "Simple, tailored questions",
          titleEs: "Preguntas simples y adaptadas",
          description: "Pour mieux te connaître et personnaliser ton interface, tes notifications et tes recommandations.",
          descriptionFr: "Pour mieux te connaître et personnaliser ton interface, tes notifications et tes recommandations.",
          descriptionEn: "To get to know you better and personalize your interface, notifications, and recommendations.",
          descriptionEs: "Para conocerte mejor y personalizar tu interfaz, notificaciones y recomendaciones.",
          order: 0
        },
        {
          icon: "⏱️",
          title: "Moins de 2 minutes",
          titleFr: "Moins de 2 minutes",
          titleEn: "Less than 2 minutes",
          titleEs: "Menos de 2 minutos",
          description: "Un questionnaire court et efficace pour démarrer rapidement.",
          descriptionFr: "Un questionnaire court et efficace pour démarrer rapidement.",
          descriptionEn: "A short, efficient questionnaire to get started quickly.",
          descriptionEs: "Un cuestionario corto y eficaz para comenzar rápidamente.",
          order: 1
        },
        {
          icon: "🎯",
          title: "Un parcours 100% personnalisé",
          titleFr: "Un parcours 100% personnalisé",
          titleEn: "A 100% personalized journey",
          titleEs: "Un recorrido 100% personalizado",
          description: "Des recommandations de contenu adaptées à tes objectifs et ton rythme de vie.",
          descriptionFr: "Des recommandations de contenu adaptées à tes objectifs et ton rythme de vie.",
          descriptionEn: "Content recommendations tailored to your goals and lifestyle.",
          descriptionEs: "Recomendaciones de contenido adaptadas a tus objetivos y estilo de vida.",
          order: 2
        }
      ]
    };

    // Keep screens 2, 3, 4 (update their order/position)
    const remainingScreens = [
      data.informationScreens[2], // "C'est noté !" at position 6
      data.informationScreens[3], // "Merci !" at position 13
      data.informationScreens[4]  // "Ton espace ORA est prêt" at position 100
    ];

    // New information screens array: merged screen + remaining screens
    data.informationScreens = [mergedScreen, ...remainingScreens];

    await docRef.set(data);

    console.log('✅ Successfully merged information screens 0 and 1');
    console.log('');
    console.log('New merged screen:');
    console.log('  Title (FR):', mergedScreen.title);
    console.log('  Title (EN):', mergedScreen.titleEn);
    console.log('  Title (ES):', mergedScreen.titleEs);
    console.log('  Subtitle (FR):', mergedScreen.subtitle);
    console.log('  Subtitle (EN):', mergedScreen.subtitleEn);
    console.log('  Subtitle (ES):', mergedScreen.subtitleEs);
    console.log('  Features:', mergedScreen.features.length);
    console.log('');
    console.log('Remaining screens:', data.informationScreens.length - 1);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

mergeInfoScreens();
