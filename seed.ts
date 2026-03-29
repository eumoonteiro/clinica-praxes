import { db } from './src/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

async function seedData() {
  try {
    await addDoc(collection(db, 'usuarios_autorizados'), {
      cpf: '15632157725',
      name: 'Coordenador Master',
      role: 'coordenacao',
      createdAt: new Date()
    });

    await addDoc(collection(db, 'usuarios_autorizados'), {
      cpf: '12345678900',
      name: 'Analista de Teste',
      role: 'analista',
      createdAt: new Date()
    });

    console.log('Seed completo!');
  } catch (e) {
    console.error(e);
  }
}

seedData();
