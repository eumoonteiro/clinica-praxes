import { useState, useEffect } from 'react';
import { db, auth, storage } from '../../lib/firebase';

import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { 
  UserPlus, 
  ShieldCheck, 
  LogOut, 
  Users, 
  DollarSign, 
  Award,
  Trash2,
  PieChart,
  MessageCircle,
  FileText,
  FileUp,
  History
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar o worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.5.207/pdf.worker.min.js`;

const CoordenacaoDashboard = () => {
  const [authorizedUsers, setAuthorizedUsers] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [prontuarios, setProntuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states (Users)
  const [newCpf, setNewCpf] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('analista');

  // Form states (Patients)
  const [newPatientName, setNewPatientName] = useState('');
  const [assignedAnalistaId, setAssignedAnalistaId] = useState('');
  const [referralDate, setReferralDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterPatientId, setFilterPatientId] = useState('');

  useEffect(() => {
    // 1. Usuarios autorizados
    const unsubAuth = onSnapshot(collection(db, 'usuarios_autorizados'), (snapshot) => {
      setAuthorizedUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Usuarios clinica
    const unsubReg = onSnapshot(collection(db, 'usuarios_clinica'), (snapshot) => {
      setRegisteredUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Pagamentos
    const unsubPay = onSnapshot(collection(db, 'pagamentos'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayments(data.sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds));
    });

    // 4. Pacientes
    const unsubPatients = onSnapshot(collection(db, 'pacientes'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPatients(data.sort((a: any, b: any) => a.name.localeCompare(b.name)));
    });

    // 5. Prontuarios
    const unsubProntuarios = onSnapshot(collection(db, 'prontuarios'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProntuarios(data.sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds));
    });

    return () => {
      unsubAuth(); unsubReg(); unsubPay(); unsubPatients(); unsubProntuarios();
    };
  }, []);

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCpf || !newName) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'usuarios_autorizados'), {
        cpf: newCpf.replace(/\D/g, ''),
        name: newName,
        role: newRole,
        supervisor: '',
        createdAt: new Date()
      });
      setNewCpf('');
      setNewName('');
      alert('Usuário autorizado com sucesso!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetSupervisor = async (userId: string, supervisorName: string) => {
    try {
      const authUser = authorizedUsers.find(u => u.id === userId);
      await updateDoc(doc(db, 'usuarios_autorizados', userId), { supervisor: supervisorName });
      const registeredUser = registeredUsers.find(u => u.cpf === authUser.cpf);
      if (registeredUser) {
        await updateDoc(doc(db, 'usuarios_clinica', registeredUser.id), { supervisor: supervisorName });
      }
      alert('Supervisão atualizada!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAuth = async (id: string) => {
    if (!confirm('Remover autorização deste CPF?')) return;
    await deleteDoc(doc(db, 'usuarios_autorizados', id));
  };

  const handleAddPatientCoord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName || !assignedAnalistaId) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'pacientes'), {
        name: newPatientName,
        analistaUid: assignedAnalistaId,
        status: 'Ativo',
        reasonStopped: '',
        assignedAt: referralDate,
        createdAt: new Date(),
        files: [],
        phone: ''
      });
      setNewPatientName('');
      setAssignedAnalistaId('');
      alert('Paciente atribuído com sucesso!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (patientId: string, file: File) => {
    if (!file) return;
    setLoading(true);
    try {
      const storageRef = ref(storage, `pacientes/${patientId}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const patient = patients.find(p => p.id === patientId);
      const newFiles = [...(patient.files || []), { 
        name: file.name, 
        url, 
        date: new Date().toISOString() 
      }];
      await updateDoc(doc(db, 'pacientes', patientId), { files: newFiles });
      alert('Arquivo processado com sucesso!');
    } catch (err: any) {
      alert("Erro ao enviar arquivo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(pay => {
    const payDate = pay.paymentDate || (pay.createdAt?.toDate ? pay.createdAt.toDate().toISOString() : '');
    const matchesYear = payDate.startsWith(filterYear);
    const matchesPatient = filterPatientId === '' || pay.patientId === filterPatientId;
    return matchesYear && matchesPatient;
  });

  const totalRepasseGlobal = filteredPayments.reduce((acc, curr) => acc + curr.repasse, 0);

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', padding: '40px 0', position: 'relative' }}>
      {loading && (
         <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(5px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '15px'
        }}>
          <div className="spinner" style={{
            width: '40px', height: '40px',
            border: '4px solid #e2e8f0',
            borderTopColor: 'var(--secondary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p className="outfit" style={{ fontWeight: 600 }}>Iniciando...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 className="outfit">Portal da Coordenação</h1>
            <p style={{ color: 'var(--text-muted)' }}>Gestão Estratégica Práxis Clínica</p>
          </div>
          <button className="btn" style={{ background: '#fee2e2', color: '#ef4444' }} onClick={() => auth.signOut()}>
            Sair <LogOut size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: 'var(--accent-glow)', color: 'var(--secondary)', padding: '15px', borderRadius: '15px' }}><DollarSign size={24}/></div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Repasse Global {filterYear}</span>
              <h3 className="outfit">R$ {totalRepasseGlobal.toFixed(2)}</h3>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: '#dcfce7', color: '#16a34a', padding: '15px', borderRadius: '15px' }}><Users size={24}/></div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Membros Ativos</span>
              <h3 className="outfit">{registeredUsers.length}</h3>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }} className="mobile-grid">
          <div>
            <div className="card" style={{ marginBottom: '30px' }}>
              <h4 className="outfit" style={{ marginBottom: '20px' }}>Atribuir Paciente</h4>
              <form onSubmit={handleAddPatientCoord}>
                <div className="form-group">
                  <label>Nome do Paciente</label>
                  <input className="form-control" value={newPatientName} onChange={e => setNewPatientName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Analista Responsável</label>
                  <select className="form-control" value={assignedAnalistaId} onChange={e => setAssignedAnalistaId(e.target.value)} required>
                    <option value="">Selecione...</option>
                    {registeredUsers.filter(u => u.role === 'analista').map(u => (
                      <option key={u.uid} value={u.uid}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Atribuir</button>
              </form>
            </div>

            <div className="card">
              <h4 className="outfit" style={{ marginBottom: '20px' }}>Autorizar CPF</h4>
              <form onSubmit={handleAuthorize}>
                <div className="form-group">
                  <label>Nome</label>
                  <input className="form-control" value={newName} onChange={e => setNewName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>CPF</label>
                  <input className="form-control" value={newCpf} onChange={e => setNewCpf(e.target.value.replace(/\D/g, ''))} required />
                </div>
                <div className="form-group">
                  <label>Papel</label>
                  <select className="form-control" value={newRole} onChange={e => setNewRole(e.target.value)}>
                    <option value="analista">Analista</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="coordenacao">Coordenação</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Autorizar</button>
              </form>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '30px' }}>
            <div className="card">
              <h4 className="outfit" style={{ marginBottom: '20px' }}><History size={20}/> Histórico Global de Evoluções</h4>
              <div style={{ display: 'grid', gap: '15px', maxHeight: '500px', overflowY: 'auto' }}>
                {prontuarios.map(pr => (
                  <div key={pr.id} className="glass" style={{ padding: '15px', borderRadius: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <h5 style={{ margin: 0 }}>{pr.patientName}</h5>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: '#e0f2fe', borderRadius: '4px' }}>{pr.type}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Analista: {pr.analistaName} • {new Date(pr.date).toLocaleDateString('pt-BR')}</p>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', marginTop: '10px' }}>
                      {pr.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h4 className="outfit" style={{ marginBottom: '20px' }}><DollarSign size={20}/> Repasses Gerais</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                      <th style={{ padding: '10px' }}>Data</th>
                      <th style={{ padding: '10px' }}>Paciente</th>
                      <th style={{ padding: '10px' }}>Analista</th>
                      <th style={{ padding: '10px' }}>Repasse</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map(pay => (
                      <tr key={pay.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>{new Date(pay.paymentDate || pay.createdAt?.toDate()).toLocaleDateString('pt-BR')}</td>
                        <td style={{ padding: '10px' }}>{pay.patientName}</td>
                        <td style={{ padding: '10px' }}>{pay.analistaName}</td>
                        <td style={{ padding: '10px', fontWeight: 700, color: pay.repasseConfirmado ? '#16a34a' : '#ef4444' }}>
                          R$ {pay.repasse.toFixed(2)}
                          <br/><span style={{ fontSize: '0.6rem' }}>{pay.repasseConfirmado ? 'Confirmado' : 'Pendente'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h4 className="outfit" style={{ marginBottom: '20px' }}><Award size={20}/> Gestão de Membros</h4>
              <div style={{ display: 'grid', gap: '15px' }}>
                {authorizedUsers.map(user => (
                  <div key={user.id} className="glass" style={{ padding: '15px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h5 style={{ margin: 0 }}>{user.name}</h5>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.role} • {user.cpf}</p>
                      <input 
                        className="form-control" 
                        style={{ fontSize: '0.8rem', marginTop: '5px' }} 
                        placeholder="Supervisor" 
                        defaultValue={user.supervisor} 
                        onBlur={(e) => handleSetSupervisor(user.id, e.target.value)}
                      />
                    </div>
                    <button className="btn" onClick={() => handleDeleteAuth(user.id)} style={{ color: '#ef4444' }}><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoordenacaoDashboard;
