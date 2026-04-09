import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot,
  doc,
  updateDoc 
} from 'firebase/firestore';
import { 
  TrendingUp,
  UserPlus,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NewUser = () => {
  const navigate = useNavigate();
  const [technicalStaff, setTechnicalStaff] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Auth form
  const [newCpf, setNewCpf] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('analista');
  const [newSupervisor, setNewSupervisor] = useState('');
  const [newAtendimentoDesde, setNewAtendimentoDesde] = useState('');

  // Patient form
  const [newPatientName, setNewPatientName] = useState('');
  const [assignedAnalistaId, setAssignedAnalistaId] = useState('');
  const [assignedAnalistaCpf, setAssignedAnalistaCpf] = useState('');

  useEffect(() => {
    // We need both registered and authorized to show in the dropdown
    const unsubAuth = onSnapshot(collection(db, 'usuarios_autorizados'), (authSnap) => {
      const auths = authSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const unsubReg = onSnapshot(collection(db, 'usuarios_clinica'), (regSnap) => {
        const regs = regSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const list: any[] = [];
        const processedCpfs = new Set();
        
        regs.forEach((r: any) => {
          if (r.role === 'coordenacao') return;
          list.push({ ...r, isRegistered: true });
          processedCpfs.add(r.cpf);
        });
        
        auths.forEach((a: any) => {
          if (a.role === 'coordenacao' || processedCpfs.has(a.cpf)) return;
          list.push({ ...a, isRegistered: false });
        });
        
        setTechnicalStaff(list);
      });
      return () => unsubReg();
    });

    const unsubPatients = onSnapshot(collection(db, 'pacientes'), (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubAuth(); unsubPatients(); };
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
        supervisor: newSupervisor,
        atendimentoDesde: newAtendimentoDesde,
        activeInClinic: true,
        createdAt: new Date()
      });
      setNewCpf(''); setNewName(''); setNewSupervisor(''); setNewAtendimentoDesde('');
      alert('Usuário autorizado!');
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName || (!assignedAnalistaId && !assignedAnalistaCpf)) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'pacientes'), {
        name: newPatientName,
        analistaUid: assignedAnalistaId || '',
        analistaCpf: assignedAnalistaCpf || '',
        status: 'Ativo',
        reasonStopped: '',
        assignedAt: new Date().toISOString().split('T')[0],
        createdAt: new Date(),
        files: []
      });
      setNewPatientName(''); setAssignedAnalistaId(''); setAssignedAnalistaCpf('');
      alert('Paciente atribuído!');
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', padding: '40px 0' }}>
      <div className="container" style={{ maxWidth: '800px' }}>
        <button onClick={() => navigate('/coordenacao')} className="btn" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', background: 'white' }}>
          <ArrowLeft size={18} /> Voltar
        </button>

        <div style={{ display: 'grid', gap: '30px' }}>
          <div className="card">
            <h4 className="outfit" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrendingUp size={20}/> Autorizar Novo Profissional (CPF)
            </h4>
            <form onSubmit={handleAuthorize}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.8rem' }}>Nome Completo</label>
                  <input className="form-control" value={newName} onChange={e => setNewName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem' }}>CPF (Apenas números)</label>
                  <input className="form-control" value={newCpf} onChange={e => setNewCpf(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem' }}>Papel</label>
                  <select className="form-control" value={newRole} onChange={e => setNewRole(e.target.value)}>
                    <option value="analista">Analista</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="coordenacao">Coordenação</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem' }}>Supervisor Associado</label>
                  <select className="form-control" value={newSupervisor} onChange={e => setNewSupervisor(e.target.value)}>
                    <option value="">Nenhum</option>
                    {technicalStaff.filter(s => s.role === 'supervisor').map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem' }}>Atende desde</label>
                  <input type="date" className="form-control" value={newAtendimentoDesde} onChange={e => setNewAtendimentoDesde(e.target.value)} />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>Gerar Autorização</button>
            </form>
          </div>

          <div className="card">
            <h4 className="outfit" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserPlus size={20}/> Atribuição Manual de Novos Casos
            </h4>
            <form onSubmit={handleAddPatient}>
              <div className="form-group">
                <label style={{ fontSize: '0.8rem' }}>Nome do Paciente</label>
                <input className="form-control" value={newPatientName} onChange={e => setNewPatientName(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem' }}>Responsável Técnico</label>
                <select 
                  className="form-control" 
                  value={assignedAnalistaId || assignedAnalistaCpf} 
                  onChange={e => {
                    const selected = technicalStaff.find(s => (s.uid === e.target.value) || (s.cpf === e.target.value));
                    if (selected?.isRegistered) {
                      setAssignedAnalistaId(selected.uid);
                      setAssignedAnalistaCpf('');
                    } else {
                      setAssignedAnalistaId('');
                      setAssignedAnalistaCpf(selected?.cpf || '');
                    }
                  }} 
                  required
                >
                  <option value="">Selecione...</option>
                  {technicalStaff.filter(u => u.role !== 'coordenacao').map(u => (
                    <option key={u.id || u.uid} value={u.uid || u.cpf}>{u.isRegistered ? u.name : `(Pendente) ${u.name}`}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>Finalizar Atribuição</button>
            </form>
          </div>

          {/* Fila de Espera / Reatribuição */}
          <div className="card" style={{ borderTop: '5px solid #f59e0b' }}>
            <h4 className="outfit" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
               Fila de Espera (Pacientes sem Analista)
            </h4>
            <div style={{ display: 'grid', gap: '15px' }}>
               {patients.filter(p => !p.analistaUid && !p.analistaCpf).map(p => (
                 <div key={p.id} className="glass" style={{ padding: '15px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h6 style={{ margin: 0 }}>{p.name}</h6>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700 }}>Aguardando Reatribuição</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                       <select 
                         className="form-control" 
                         style={{ width: 'auto', fontSize: '0.8rem', padding: '5px' }}
                         onChange={async (e) => {
                           const val = e.target.value;
                           if(!val) return;
                           const selected = technicalStaff.find(att => (att.uid === val) || (att.cpf === val));
                           if(confirm(`Atribuir ${p.name} para ${selected.name}?`)) {
                             try {
                               await updateDoc(doc(db, 'pacientes', p.id), {
                                 analistaUid: selected.isRegistered ? selected.uid : '',
                                 analistaCpf: selected.cpf,
                                 status: 'Ativo',
                                 assignedAt: new Date().toISOString().split('T')[0]
                               });
                               alert('Paciente atribuído com sucesso!');
                             } catch(err: any) { alert(err.message); }
                           }
                         }}
                       >
                         <option value="">Atribuir para...</option>
                         {technicalStaff.filter(ts => ts.role !== 'coordenacao').map(ts => (
                            <option key={ts.id || ts.uid} value={ts.uid || ts.cpf}>{ts.name}</option>
                         ))}
                       </select>
                    </div>
                 </div>
               ))}
               {patients.filter(p => !p.analistaUid && !p.analistaCpf).length === 0 && (
                 <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Não há pacientes aguardando atribuição no momento.</p>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewUser;
