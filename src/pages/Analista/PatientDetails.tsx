import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth, storage } from '../../lib/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  ArrowLeft, 
  FileText, 
  Plus,
  Save,
  DollarSign,
  TrendingUp,
  FileUp,
  Loader2
} from 'lucide-react';

const PatientDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [prontuarios, setProntuarios] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  
  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editedPatient, setEditedPatient] = useState<any>(null);

  // Modal states
  const [showEvolucaoModal, setShowEvolucaoModal] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  
  // Form states
  const [evolucaoContent, setEvolucaoContent] = useState('');
  const [evolucaoType, setEvolucaoType] = useState('Evolução Semanal');
  const [evolucaoDate, setEvolucaoDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [pagamentoValue, setPagamentoValue] = useState('');
  const [pagamentoDate, setPagamentoDate] = useState(new Date().toISOString().split('T')[0]);
  const [repasseRealizado, setRepasseRealizado] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchPatient = async () => {
      const docRef = doc(db, 'pacientes', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setPatient(data);
        setEditedPatient(data);
      }
      setLoading(false);
    };

    fetchPatient();

    const qProntuarios = query(
      collection(db, 'prontuarios'), 
      where('patientId', '==', id)
    );
    const unsubProntuarios = onSnapshot(qProntuarios, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProntuarios(data.sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds));
    });

    const qPayments = query(
      collection(db, 'pagamentos'), 
      where('patientId', '==', id)
    );
    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayments(data.sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds));
    });

    return () => {
      unsubProntuarios();
      unsubPayments();
    };
  }, [id]);

  const handleUpdatePatient = async () => {
    if (!id || !editedPatient) return;
    try {
      await updateDoc(doc(db, 'pacientes', id), editedPatient);
      setPatient(editedPatient);
      setIsEditing(false);
      alert('Dados do paciente atualizados!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file || !id) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `pacientes/${id}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const newFiles = [...(patient.files || []), { 
        name: file.name, 
        url, 
        date: new Date().toISOString() 
      }];
      
      await updateDoc(doc(db, 'pacientes', id), { files: newFiles });
      setPatient({ ...patient, files: newFiles });
      alert('Arquivo enviado com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert('Erro no upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddEvolucao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !evolucaoContent) return;
    try {
      await addDoc(collection(db, 'prontuarios'), {
        patientId: id,
        patientName: patient.name,
        analistaUid: auth.currentUser?.uid,
        analistaName: auth.currentUser?.displayName || 'Analista',
        content: evolucaoContent,
        type: evolucaoType,
        date: evolucaoDate,
        createdAt: serverTimestamp()
      });
      setEvolucaoContent('');
      setShowEvolucaoModal(false);
      alert('Evolução registrada!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddPagamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !pagamentoValue) return;
    try {
      const val = parseFloat(pagamentoValue);
      const repasseVal = val * 0.20;
      await addDoc(collection(db, 'pagamentos'), {
        patientId: id,
        patientName: patient.name,
        analistaUid: auth.currentUser?.uid,
        analistaName: auth.currentUser?.displayName || 'Analista',
        value: val,
        repasse: repasseVal,
        paymentDate: pagamentoDate,
        repasseConfirmado: repasseRealizado,
        createdAt: serverTimestamp()
      });
      setPagamentoValue('');
      setRepasseRealizado(false);
      setShowPagamentoModal(false);
      alert('Pagamento registrado!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="container" style={{ padding: '40px', textAlign: 'center' }}>Carregando dados do paciente...</div>;
  if (!patient) return <div className="container" style={{ padding: '40px', textAlign: 'center' }}>Paciente não encontrado.</div>;

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', padding: '40px 0' }}>
      <div className="container">
        {/* Header Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
          <button className="btn" style={{ padding: '10px', background: 'white' }} onClick={() => navigate(-1)}>
            <ArrowLeft size={20}/>
          </button>
          <h2 className="outfit">Ficha do Paciente</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }} className="mobile-grid">
          {/* Left Column: Personal Data */}
          <div>
            <div className="card" style={{ marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 className="outfit" style={{ margin: 0 }}>Dados Pessoais</h4>
                <button className="btn" style={{ padding: '8px 15px', fontSize: '0.8rem', background: isEditing ? '#fee2e2' : 'var(--accent-glow)', color: isEditing ? '#ef4444' : 'var(--secondary)' }} onClick={() => setIsEditing(!isEditing)}>
                  {isEditing ? 'Cancelar' : 'Editar'}
                </button>
              </div>

              <div style={{ display: 'grid', gap: '15px' }}>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nome Completo</label>
                  {isEditing ? (
                    <input className="form-control" value={editedPatient.name} onChange={e => setEditedPatient({...editedPatient, name: e.target.value})} />
                  ) : (
                    <p style={{ fontWeight: 600 }}>{patient.name}</p>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CPF</label>
                  {isEditing ? (
                    <input className="form-control" value={editedPatient.cpf || ''} onChange={e => setEditedPatient({...editedPatient, cpf: e.target.value})} />
                  ) : (
                    <p style={{ fontWeight: 600 }}>{patient.cpf || 'Não informado'}</p>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Data de Nascimento</label>
                  {isEditing ? (
                    <input type="date" className="form-control" value={editedPatient.birthDate || ''} onChange={e => setEditedPatient({...editedPatient, birthDate: e.target.value})} />
                  ) : (
                    <p style={{ fontWeight: 600 }}>{patient.birthDate ? new Date(patient.birthDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informado'}</p>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>WhatsApp</label>
                  {isEditing ? (
                    <input className="form-control" value={editedPatient.phone || ''} onChange={e => setEditedPatient({...editedPatient, phone: e.target.value})} />
                  ) : (
                    <p style={{ fontWeight: 600 }}>{patient.phone || 'Não informado'}</p>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email</label>
                  {isEditing ? (
                    <input className="form-control" value={editedPatient.email || ''} onChange={e => setEditedPatient({...editedPatient, email: e.target.value})} />
                  ) : (
                    <p style={{ fontWeight: 600 }}>{patient.email || 'Não informado'}</p>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Início do Atendimento</label>
                  {isEditing ? (
                    <input type="date" className="form-control" value={editedPatient.assignedAt || ''} onChange={e => setEditedPatient({...editedPatient, assignedAt: e.target.value})} />
                  ) : (
                    <p style={{ fontWeight: 600 }}>{patient.assignedAt ? new Date(patient.assignedAt + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informado'}</p>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Valor Combinado (R$)</label>
                  {isEditing ? (
                    <input type="number" className="form-control" value={editedPatient.valuePerSession || ''} onChange={e => setEditedPatient({...editedPatient, valuePerSession: e.target.value})} />
                  ) : (
                    <p style={{ fontWeight: 600 }}>R$ {patient.valuePerSession || '0,00'}</p>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</label>
                  {isEditing ? (
                    <select className="form-control" value={editedPatient.status} onChange={e => setEditedPatient({...editedPatient, status: e.target.value})}>
                      <option value="Ativo">Ativo</option>
                      <option value="Encerrado">Encerrado</option>
                    </select>
                  ) : (
                    <span style={{ 
                      fontSize: '0.75rem', 
                      padding: '4px 12px', 
                      borderRadius: '100px', 
                      background: patient.status === 'Ativo' ? '#dcfce7' : '#fee2e2',
                      color: patient.status === 'Ativo' ? '#16a34a' : '#ef4444',
                      fontWeight: 700
                    }}>
                      {patient.status}
                    </span>
                  )}
                </div>

                {patient.status !== 'Ativo' && (
                  <>
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Data de Encerramento</label>
                      {isEditing ? (
                        <input type="date" className="form-control" value={editedPatient.endedAt || ''} onChange={e => setEditedPatient({...editedPatient, endedAt: e.target.value})} />
                      ) : (
                        <p style={{ fontWeight: 600, color: '#ef4444' }}>{patient.endedAt ? new Date(patient.endedAt + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</p>
                      )}
                    </div>
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Motivo do Encerramento</label>
                      {isEditing ? (
                        <textarea className="form-control" value={editedPatient.reasonStopped || ''} onChange={e => setEditedPatient({...editedPatient, reasonStopped: e.target.value})} />
                      ) : (
                        <p style={{ fontStyle: 'italic' }}>{patient.reasonStopped || 'Não informado'}</p>
                      )}
                    </div>
                  </>
                )}

                {isEditing && (
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} onClick={handleUpdatePatient}>
                    <Save size={18}/> Salvar Alterações
                  </button>
                )}
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 className="outfit" style={{ margin: 0 }}>Documentos</h4>
                <label className="btn" style={{ padding: '8px 15px', fontSize: '0.8rem', background: 'var(--accent-glow)', color: 'var(--secondary)', cursor: 'pointer', display: 'flex', gap: '8px' }}>
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16}/>}
                  {uploading ? 'Enviando...' : 'Subir PDF'}
                  <input type="file" accept="application/pdf" style={{ display: 'none' }} disabled={uploading} onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                </label>
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {patient.files?.map((file: any, i: number) => (
                  <a key={i} href={file.url} target="_blank" className="glass" style={{ padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'var(--primary)', fontSize: '0.9rem' }}>
                    <FileText size={18} color="var(--secondary)"/>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                  </a>
                ))}
                {(!patient.files || patient.files.length === 0) && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>Nenhum documento anexado.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Evolution & Finance */}
          <div>
            {/* Nav Tabs (Simple) */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
              <div className="card" style={{ flex: 1, padding: '20px' }}>
                <h5 className="outfit" style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <TrendingUp size={20} color="var(--secondary)"/> Evolução Clínica
                  <button className="btn" style={{ marginLeft: 'auto', padding: '6px', background: 'var(--primary)', color: 'white', borderRadius: '8px' }} onClick={() => setShowEvolucaoModal(true)}>
                    <Plus size={16}/>
                  </button>
                </h5>
                
                <div style={{ display: 'grid', gap: '15px', maxHeight: '500px', overflowY: 'auto' }}>
                  {prontuarios.map(pr => (
                    <div key={pr.id} style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', borderLeft: '4px solid var(--secondary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{pr.type}</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{new Date(pr.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'pre-wrap', opacity: 0.8 }}>{pr.content}</p>
                    </div>
                  ))}
                  {prontuarios.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Sem evoluções registradas.</p>
                  )}
                </div>
              </div>

              <div className="card" style={{ flex: 1, padding: '20px' }}>
                <h5 className="outfit" style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <DollarSign size={20} color="#16a34a"/> Financeiro
                  <button className="btn" style={{ marginLeft: 'auto', padding: '6px', background: '#16a34a', color: 'white', borderRadius: '8px' }} onClick={() => setShowPagamentoModal(true)}>
                    <Plus size={16}/>
                  </button>
                </h5>

                <div style={{ display: 'grid', gap: '10px' }}>
                   {payments.map(pay => (
                     <div key={pay.id} style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div>
                         <p style={{ fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>R$ {pay.value.toFixed(2)}</p>
                         <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6 }}>{new Date(pay.paymentDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                       </div>
                       <div style={{ textAlign: 'right' }}>
                         <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#ef4444' }}>- R$ {pay.repasse.toFixed(2)}</p>
                         <span style={{ fontSize: '0.65rem', color: pay.repasseConfirmado ? '#16a34a' : '#f59e0b' }}>
                           {pay.repasseConfirmado ? 'Repasse OK' : 'Pendente'}
                         </span>
                       </div>
                     </div>
                   ))}
                   {payments.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Sem pagamentos registrados.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Evolução Modal */}
      {showEvolucaoModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <h4 className="outfit" style={{ marginBottom: '20px' }}>Registrar Evolução</h4>
            <form onSubmit={handleAddEvolucao}>
              <div className="form-group">
                <label>Data</label>
                <input type="date" className="form-control" value={evolucaoDate} onChange={e => setEvolucaoDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select className="form-control" value={evolucaoType} onChange={e => setEvolucaoType(e.target.value)}>
                  <option value="Evolução Diária">Evolução Diária</option>
                  <option value="Evolução Semanal">Evolução Semanal</option>
                  <option value="Evolução Mensal">Evolução Mensal</option>
                  <option value="Sessão Extra">Sessão Extra</option>
                </select>
              </div>
              <div className="form-group">
                <label>Conteúdo</label>
                <textarea className="form-control" style={{ minHeight: '150px' }} value={evolucaoContent} onChange={e => setEvolucaoContent(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Salvar</button>
                <button type="button" className="btn" style={{ flex: 1, background: '#f1f5f9' }} onClick={() => setShowEvolucaoModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pagamento Modal */}
      {showPagamentoModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <h4 className="outfit" style={{ marginBottom: '20px' }}>Lançar Recebimento</h4>
            <form onSubmit={handleAddPagamento}>
              <div className="form-group">
                <label>Data</label>
                <input type="date" className="form-control" value={pagamentoDate} onChange={e => setPagamentoDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Valor Recebido (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-control" 
                  value={pagamentoValue} 
                  onChange={e => setPagamentoValue(e.target.value)} 
                  placeholder={patient.valuePerSession ? `Ex: ${patient.valuePerSession}` : '0.00'}
                  required 
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={repasseRealizado} onChange={e => setRepasseRealizado(e.target.checked)} />
                  Repasse já realizado (20%)
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#16a34a' }}>Confirmar</button>
                <button type="button" className="btn" style={{ flex: 1, background: '#f1f5f9' }} onClick={() => setShowPagamentoModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetails;
