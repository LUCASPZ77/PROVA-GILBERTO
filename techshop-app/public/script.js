// Funções globais para o painel TechShop

async function carregarVendas() {
  try {
    const res = await fetch('/api/vendas');
    const vendas = await res.json();
    if (!res.ok) throw new Error(vendas.erro || 'Erro ao carregar vendas.');
    const tbody = document.querySelector('#tabelaVendas tbody');
    if (!tbody) return;
    tbody.innerHTML = vendas.map(v => `
      <tr>
        <td>${v.id_pedido}</td>
        <td>${v.cliente}</td>
        <td>${v.total}</td>
        <td>${v.status}</td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Erro ao carregar vendas:', e);
  }
}

async function carregarEstoque() {
  try {
    const res = await fetch('/api/estoque');
    const produtos = await res.json();
    if (!res.ok) throw new Error(produtos.erro || 'Erro ao carregar estoque.');
    const tbody = document.querySelector('#tabelaEstoque tbody');
    if (!tbody) return;
    tbody.innerHTML = produtos.map(p => `
      <tr>
        <td>${p.produto}</td>
        <td>
          <input type="number" id="input-${p.id}" value="${p.estoque}" style="width:70px;">
        </td>
        <td>${p.total_vendido} und</td>
        <td>
          <button type="button" class="acao-admin" onclick="salvarEstoque(event, '${p.id}')" style="background:#28a745;color:white;border:none;padding:6px 14px;border-radius:4px;cursor:pointer;">
            Salvar
          </button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Erro ao carregar estoque:', e);
  }
}

async function salvarEstoque(event, id) {
  if (event) event.preventDefault();
  const input = document.getElementById(`input-${id}`);
  if (!input) return;
  const novoValor = Number(input.value);
  if (isNaN(novoValor)) {
    alert('Valor inválido.');
    return;
  }

  try {
    const res = await fetch(`/api/estoque/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'user-level': obterNivelAcesso() },
      body: JSON.stringify({ estoque: novoValor })
    });

    if (res.ok) {
      alert('Estoque atualizado e gravado no MongoDB!');
      await carregarEstoque();
    } else {
      const erro = await res.json();
      alert(erro.erro || 'Erro ao salvar alteração.');
    }
  } catch (e) {
    alert('Falha na comunicação com o servidor.');
  }
}

async function carregarClientes() {
  try {
    const res = await fetch('/api/clientes');
    const clientes = await res.json();
    if (!res.ok) throw new Error(clientes.erro || 'Erro ao carregar clientes.');
    const tbody = document.querySelector('#tabelaClientes tbody');
    if (!tbody) return;
    tbody.innerHTML = clientes.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${c.nome}</td>
        <td>${c.email}</td>
        <td>${c.telefone || 'N/A'}</td>
        <td>
          <button type="button" class="acao-admin" onclick="excluirCliente(event, '${c.id}')" style="background:#dc3545;color:white;border:none;padding:6px 14px;border-radius:4px;cursor:pointer;">
            Excluir
          </button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Erro ao carregar clientes:', e);
  }
}

async function excluirCliente(event, id) {
  if (event) event.preventDefault();
  if (!confirm('Deseja realmente remover este cliente?')) return;

  try {
    const res = await fetch(`/api/clientes/${id}`, {
      method: 'DELETE',
      headers: { 'user-level': obterNivelAcesso() }
    });
    if (res.ok) {
      alert('Cliente removido!');
      await carregarClientes();
    } else {
      const erro = await res.json();
      alert(erro.erro || 'Erro ao excluir cliente.');
    }
  } catch (e) {
    alert('Erro ao excluir cliente.');
  }
}

function obterNivelAcesso() {
  return document.getElementById('nivelAcesso')?.value || 'Client';
}

function atualizarInterface() {
  const isAdmin = obterNivelAcesso() === 'Admin';
  document.querySelectorAll('.acao-admin').forEach(botao => {
    botao.disabled = !isAdmin;
    botao.title = isAdmin ? 'Ação administrativa' : 'Disponível apenas para Admin';
  });
}

async function validarGoogle(credential) {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential })
  });
  const dados = await res.json();
  if (!res.ok) throw new Error(dados.erro || 'Falha no login Google.');
  document.getElementById('usuarioGoogle').textContent = `Conectado: ${dados.usuario.nome}`;
}

async function configurarLoginGoogle() {
  const config = await fetch('/api/config').then(res => res.json());
  const container = document.getElementById('googleLogin');
  if (!config.googleClientId || !window.google?.accounts?.id) {
    container.textContent = 'Configure GOOGLE_CLIENT_ID para habilitar o login Google.';
    return;
  }
  google.accounts.id.initialize({ client_id: config.googleClientId, callback: response => validarGoogle(response.credential).catch(error => alert(error.message)) });
  google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', text: 'signin_with' });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nivelAcesso').addEventListener('change', atualizarInterface);
  carregarVendas();
  carregarEstoque();
  carregarClientes();
  configurarLoginGoogle();
  atualizarInterface();
});