// Sistema de Pedidos Bubble Tea SLZ - CRUD Completo

class PedidoService {
    constructor() {
        this.pedidos = [];
        this.proximoId = 1;
        this.init();
    }

    async init() {
        await this.carregarPedidos();
    }

    // CREATE
    async criarPedido(pedidoData) {
        const idCompra = `BTS${this.proximoId.toString().padStart(4, '0')}${new Date().getFullYear().toString().substr(-2)}`;
        
        const pedido = {
            id: this.proximoId++,
            idCompra,
            ...pedidoData,
            data: new Date().toISOString(),
            status: 'pendente',
            dataStatus: new Date().toISOString()
        };
        
        this.pedidos.push(pedido);
        await this.salvarPedidos();
        return pedido;
    }

    // READ
    async listarPedidos(filtros = {}) {
        let pedidosFiltrados = [...this.pedidos];
        
        // Filtrar por cliente
        if (filtros.cliente) {
            const termo = filtros.cliente.toLowerCase();
            pedidosFiltrados = pedidosFiltrados.filter(p => 
                p.cliente.toLowerCase().includes(termo) || 
                p.idCompra.toLowerCase().includes(termo)
            );
        }
        
        // Filtrar por status
        if (filtros.status && filtros.status !== 'all') {
            pedidosFiltrados = pedidosFiltrados.filter(p => p.status === filtros.status);
        }
        
        // Filtrar por data
        if (filtros.data && filtros.data !== 'all') {
            const hoje = new Date();
            pedidosFiltrados = pedidosFiltrados.filter(p => {
                const dataPedido = new Date(p.data);
                
                switch(filtros.data) {
                    case 'hoje':
                        return dataPedido.toDateString() === hoje.toDateString();
                    case 'ontem':
                        const ontem = new Date(hoje);
                        ontem.setDate(ontem.getDate() - 1);
                        return dataPedido.toDateString() === ontem.toDateString();
                    case 'semana':
                        const semanaPassada = new Date(hoje);
                        semanaPassada.setDate(semanaPassada.getDate() - 7);
                        return dataPedido >= semanaPassada;
                    default:
                        return true;
                }
            });
        }
        
        // Ordenar por data (mais recente primeiro)
        return pedidosFiltrados.sort((a, b) => new Date(b.data) - new Date(a.data));
    }

    async buscarPedidoPorId(id) {
        return this.pedidos.find(p => p.id === id);
    }

    // UPDATE
    async atualizarPedido(id, dadosAtualizados) {
        const index = this.pedidos.findIndex(p => p.id === id);
        if (index === -1) return null;
        
        this.pedidos[index] = {
            ...this.pedidos[index],
            ...dadosAtualizados,
            dataStatus: new Date().toISOString()
        };
        
        await this.salvarPedidos();
        return this.pedidos[index];
    }

    async atualizarStatusPedido(id, novoStatus) {
        return this.atualizarPedido(id, { status: novoStatus });
    }

    // DELETE
    async excluirPedido(id) {
        const index = this.pedidos.findIndex(p => p.id === id);
        if (index === -1) return false;
        
        const pedidoExcluido = this.pedidos[index];
        this.pedidos.splice(index, 1);
        await this.salvarPedidos();
        
        return pedidoExcluido;
    }

    async limparTodosPedidos() {
        const quantidade = this.pedidos.length;
        this.pedidos = [];
        this.proximoId = 1;
        await this.salvarPedidos();
        return quantidade;
    }

    // Métodos auxiliares
    async carregarPedidos() {
        const dados = localStorage.getItem('bubbleTeaPedidos');
        if (dados) {
            const parsed = JSON.parse(dados);
            this.pedidos = parsed.pedidos || [];
            this.proximoId = parsed.proximoId || 1;
        }
    }

    async salvarPedidos() {
        const dados = {
            pedidos: this.pedidos,
            proximoId: this.proximoId
        };
        localStorage.setItem('bubbleTeaPedidos', JSON.stringify(dados));
    }

    // Métodos de relatório
    async obterEstatisticas() {
        const hoje = new Date().toDateString();
        const pedidosHoje = this.pedidos.filter(p => 
            new Date(p.data).toDateString() === hoje
        );
        
        const total = this.pedidos.length;
        const hojeCount = pedidosHoje.length;
        const receitaTotal = this.pedidos.reduce((sum, p) => sum + p.preco, 0);
        const receitaHoje = pedidosHoje.reduce((sum, p) => sum + p.preco, 0);
        
        return {
            total,
            hoje: hojeCount,
            receitaTotal,
            receitaHoje
        };
    }
}

class ToastService {
    constructor() {
        this.toastCount = 0;
        this.estilosAdicionados = false;
        this.adicionarEstilos();
    }

    adicionarEstilos() {
        if (this.estilosAdicionados) return;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        this.estilosAdicionados = true;
    }

    mostrar(mensagem, tipo = 'info', duracao = 3000) {
        this.toastCount++;
        const toastId = `toast-${Date.now()}-${this.toastCount}`;
        const offset = (this.toastCount - 1) * 70;
        
        const configs = {
            sucesso: { cor: '#4caf50', icone: 'fa-check-circle', titulo: 'Sucesso' },
            erro: { cor: '#f44336', icone: 'fa-exclamation-circle', titulo: 'Erro' },
            info: { cor: '#2196f3', icone: 'fa-info-circle', titulo: 'Informação' },
            aviso: { cor: '#ff9800', icone: 'fa-exclamation-triangle', titulo: 'Aviso' }
        };
        
        const config = configs[tipo] || configs.info;
        
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.style.cssText = `
            position: fixed;
            bottom: ${20 + offset}px;
            right: 20px;
            background: linear-gradient(135deg, ${config.cor}, ${config.cor}dd);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            max-width: 350px;
            animation: slideInRight 0.3s ease, fadeOut 0.3s ease ${duracao - 300}ms forwards;
            border-left: 5px solid ${config.cor};
        `;
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <i class="fas ${config.icone}" style="font-size: 1.2rem; margin-right: 10px;"></i>
                <strong style="font-size: 1.1rem;">${config.titulo}</strong>
            </div>
            <div style="font-size: 0.95rem;">
                ${mensagem}
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            const toastElement = document.getElementById(toastId);
            if (toastElement) {
                toastElement.style.animation = 'fadeOut 0.3s ease forwards';
                setTimeout(() => {
                    if (toastElement.parentNode) {
                        toastElement.parentNode.removeChild(toastElement);
                        this.toastCount--;
                        this.reorganizarToasts();
                    }
                }, 300);
            }
        }, duracao);
        
        return toastId;
    }

    reorganizarToasts() {
        const toasts = document.querySelectorAll('[id^="toast-"]');
        toasts.forEach((toast, index) => {
            toast.style.bottom = `${20 + (index * 70)}px`;
        });
    }
}

class PedidoController {
    constructor() {
        this.pedidoService = new PedidoService();
        this.toastService = new ToastService();
        this.modoEdicao = false;
        this.pedidoEditando = null;
        this.inicializarElementos();
        this.configurarEventos();
        this.inicializar();
    }

    inicializarElementos() {
        // Navegação
        this.tabCriar = document.getElementById('tab-criar');
        this.tabVer = document.getElementById('tab-ver');
        this.criarPedidoSection = document.getElementById('criar-pedido');
        this.verPedidosSection = document.getElementById('ver-pedidos');
        
        // Formulário
        this.pedidoForm = document.getElementById('pedido-form');
        this.pedidoId = document.getElementById('pedido-id');
        this.nomeCliente = document.getElementById('nome-cliente');
        this.observacoes = document.getElementById('observacoes');
        this.tipoChaRadios = document.querySelectorAll('input[name="tipo-cha"]');
        this.tamanhoRadios = document.querySelectorAll('input[name="tamanho"]');
        
        // Resumo
        this.formTitle = document.getElementById('form-title');
        this.resumoIdCompra = document.getElementById('resumo-id-compra');
        this.resumoCliente = document.getElementById('resumo-cliente');
        this.resumoCha = document.getElementById('resumo-cha');
        this.resumoTamanho = document.getElementById('resumo-tamanho');
        this.resumoPreco = document.getElementById('resumo-preco');
        this.resumoTotal = document.getElementById('resumo-total');
        
        // Botões do formulário
        this.btnSubmit = document.getElementById('btn-submit');
        this.btnCancelar = document.getElementById('btn-cancelar');
        this.btnLimpar = document.getElementById('btn-limpar');
        
        // Lista de pedidos
        this.pedidosGrid = document.getElementById('pedidos-grid');
        this.noPedidos = document.getElementById('no-pedidos');
        
        // Filtros
        this.filterCliente = document.getElementById('filter-cliente');
        this.filterStatus = document.getElementById('filter-status');
        this.filterData = document.getElementById('filter-data');
        this.btnAtualizar = document.getElementById('btn-atualizar');
        
        // Estatísticas
        this.totalPedidos = document.getElementById('total-pedidos');
        this.pedidosHoje = document.getElementById('pedidos-hoje');
        this.receitaHoje = document.getElementById('receita-hoje');
        this.totalReceita = document.getElementById('total-receita');
        
        // Botões de ação
        this.btnLimparTodos = document.getElementById('btn-limpar-todos');
        
        // Data/Hora
        this.dataHora = document.getElementById('data-hora');
        
        // Dados auxiliares
        this.chaNomes = {
            'cha-verde': 'Chá Verde',
            'manga-morango': 'Chá de Manga com Morango',
            'milk-tea': 'Milk Tea Clássico'
        };
        
        this.tamanhoNomes = {
            'pequeno': 'Pequeno (300ml)',
            'medio': 'Médio (500ml)',
            'grande': 'Grande (700ml)'
        };
        
        this.precos = {
            'pequeno': 15.00,
            'medio': 17.00,
            'grande': 20.00
        };
        
        this.statusInfo = {
            'pendente': { nome: 'Pendente', cor: '#ff9800', icon: 'fa-clock' },
            'preparando': { nome: 'Preparando', cor: '#2196f3', icon: 'fa-blender' },
            'pronto': { nome: 'Pronto', cor: '#4caf50', icon: 'fa-check' },
            'entregue': { nome: 'Entregue', cor: '#9c27b0', icon: 'fa-mug-hot' }
        };
    }

    configurarEventos() {
        // Navegação
        this.tabCriar.addEventListener('click', (e) => {
            e.preventDefault();
            this.mostrarAba('criar');
        });

        this.tabVer.addEventListener('click', (e) => {
            e.preventDefault();
            this.mostrarAba('ver');
        });

        // Formulário
        this.pedidoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.salvarPedido();
        });

        // Atualização em tempo real
        this.nomeCliente.addEventListener('input', () => this.atualizarResumo());
        this.observacoes.addEventListener('input', () => this.atualizarResumo());
        
        this.tipoChaRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.atualizarResumo();
                this.atualizarSelecaoCha();
            });
        });
        
        this.tamanhoRadios.forEach(radio => {
            radio.addEventListener('change', () => this.atualizarResumo());
        });

        // Cards de chá
        document.querySelectorAll('.cha-card').forEach(card => {
            card.addEventListener('click', () => {
                const radio = card.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    this.atualizarResumo();
                    this.atualizarSelecaoCha();
                }
            });
        });

        // Botões do formulário
        this.btnCancelar.addEventListener('click', () => this.cancelarEdicao());
        this.btnLimpar.addEventListener('click', () => this.limparFormulario());

        // Filtros
        this.filterCliente.addEventListener('input', () => this.atualizarListaPedidos());
        this.filterStatus.addEventListener('change', () => this.atualizarListaPedidos());
        this.filterData.addEventListener('change', () => this.atualizarListaPedidos());
        this.btnAtualizar.addEventListener('click', () => this.atualizarListaPedidos());

        // Botões de ação
        this.btnLimparTodos.addEventListener('click', () => this.limparTodosPedidos());

        // Data/Hora
        this.atualizarDataHora();
        setInterval(() => this.atualizarDataHora(), 1000);
    }

    async inicializar() {
        await this.pedidoService.init();
        this.atualizarResumo();
        this.atualizarInterface();
    }

    // Navegação
    mostrarAba(aba) {
        this.tabCriar.classList.remove('active');
        this.tabVer.classList.remove('active');
        
        if (aba === 'criar') {
            this.tabCriar.classList.add('active');
            this.criarPedidoSection.classList.add('active');
            this.verPedidosSection.classList.remove('active');
        } else {
            this.tabVer.classList.add('active');
            this.criarPedidoSection.classList.remove('active');
            this.verPedidosSection.classList.add('active');
            this.atualizarListaPedidos();
        }
    }

    // Formulário
    atualizarSelecaoCha() {
        document.querySelectorAll('.cha-card').forEach(card => {
            card.classList.remove('selected');
            const radio = card.querySelector('input[type="radio"]');
            if (radio && radio.checked) {
                card.classList.add('selected');
            }
        });
    }

    atualizarResumo() {
        // Cliente
        const cliente = this.nomeCliente.value.trim() || '--';
        this.resumoCliente.textContent = cliente;
        
        // Chá
        let chaSelecionado = '--';
        this.tipoChaRadios.forEach(radio => {
            if (radio.checked) {
                chaSelecionado = this.chaNomes[radio.value];
            }
        });
        this.resumoCha.textContent = chaSelecionado;
        
        // Tamanho
        let tamanhoSelecionado = '--';
        let preco = 0;
        this.tamanhoRadios.forEach(radio => {
            if (radio.checked) {
                tamanhoSelecionado = this.tamanhoNomes[radio.value];
                preco = this.precos[radio.value];
            }
        });
        this.resumoTamanho.textContent = tamanhoSelecionado;
        this.resumoPreco.textContent = `R$ ${preco.toFixed(2)}`;
        this.resumoTotal.textContent = `R$ ${preco.toFixed(2)}`;
        
        // ID da compra
        if (this.modoEdicao && this.pedidoEditando) {
            this.resumoIdCompra.textContent = `ID: ${this.pedidoEditando.idCompra}`;
        } else {
            this.resumoIdCompra.textContent = 'ID: --';
        }
    }

    validarFormulario() {
        let valido = true;
        let mensagens = [];
        
        // Validar nome do cliente
        if (!this.nomeCliente.value.trim()) {
            mensagens.push('Por favor, insira o nome do cliente');
            this.nomeCliente.focus();
            valido = false;
        } else if (this.nomeCliente.value.trim().length < 2) {
            mensagens.push('O nome do cliente deve ter pelo menos 2 caracteres');
            this.nomeCliente.focus();
            valido = false;
        }
        
        // Validar chá selecionado
        const chaSelecionado = document.querySelector('input[name="tipo-cha"]:checked');
        if (!chaSelecionado) {
            mensagens.push('Por favor, selecione um tipo de chá');
            valido = false;
        }
        
        // Validar tamanho selecionado
        const tamanhoSelecionado = document.querySelector('input[name="tamanho"]:checked');
        if (!tamanhoSelecionado) {
            mensagens.push('Por favor, selecione um tamanho de copo');
            valido = false;
        }
        
        if (!valido) {
            mensagens.forEach(msg => this.toastService.mostrar(msg, 'erro'));
        }
        
        return valido;
    }

    async salvarPedido() {
        if (!this.validarFormulario()) return;
        
        const pedidoData = {
            cliente: this.nomeCliente.value.trim(),
            cha: document.querySelector('input[name="tipo-cha"]:checked').value,
            tamanho: document.querySelector('input[name="tamanho"]:checked').value,
            observacoes: this.observacoes.value.trim(),
            preco: this.precos[document.querySelector('input[name="tamanho"]:checked').value]
        };
        
        try {
            let resultado;
            
            if (this.modoEdicao) {
                resultado = await this.pedidoService.atualizarPedido(this.pedidoEditando.id, pedidoData);
                this.toastService.mostrar(
                    `Pedido ${resultado.idCompra} atualizado com sucesso!`,
                    'sucesso'
                );
                this.cancelarEdicao();
            } else {
                resultado = await this.pedidoService.criarPedido(pedidoData);
                this.toastService.mostrar(
                    `Pedido ${resultado.idCompra} criado com sucesso!<br>
                    Cliente: ${resultado.cliente}<br>
                    Valor: R$ ${resultado.preco.toFixed(2)}`,
                    'sucesso'
                );
                this.limparFormulario();
            }
            
            await this.atualizarInterface();
            
        } catch (error) {
            this.toastService.mostrar(
                `Erro ao ${this.modoEdicao ? 'atualizar' : 'criar'} pedido: ${error.message}`,
                'erro'
            );
        }
    }

    prepararEdicao(pedido) {
        this.modoEdicao = true;
        this.pedidoEditando = pedido;
        
        // Preencher formulário
        this.pedidoId.value = pedido.id;
        this.nomeCliente.value = pedido.cliente;
        this.observacoes.value = pedido.observacoes || '';
        
        // Selecionar chá
        document.querySelector(`input[value="${pedido.cha}"]`).checked = true;
        
        // Selecionar tamanho
        document.querySelector(`input[value="${pedido.tamanho}"]`).checked = true;
        
        // Atualizar interface
        this.formTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Pedido';
        this.btnSubmit.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
        this.btnCancelar.style.display = 'inline-flex';
        
        this.atualizarResumo();
        this.atualizarSelecaoCha();
        this.mostrarAba('criar');
    }

    cancelarEdicao() {
        this.modoEdicao = false;
        this.pedidoEditando = null;
        
        this.formTitle.innerHTML = '<i class="fas fa-plus-square"></i> Novo Pedido';
        this.btnSubmit.innerHTML = '<i class="fas fa-check-circle"></i> Criar Pedido';
        this.btnCancelar.style.display = 'none';
        
        this.limparFormulario();
    }

    limparFormulario() {
        this.pedidoForm.reset();
        this.observacoes.value = '';
        this.pedidoId.value = '';
        this.atualizarResumo();
        this.atualizarSelecaoCha();
    }

    // Lista de pedidos
    async atualizarListaPedidos() {
        const filtros = {
            cliente: this.filterCliente.value.trim(),
            status: this.filterStatus.value,
            data: this.filterData.value
        };
        
        try {
            const pedidos = await this.pedidoService.listarPedidos(filtros);
            this.renderizarPedidos(pedidos);
        } catch (error) {
            this.toastService.mostrar(`Erro ao carregar pedidos: ${error.message}`, 'erro');
        }
    }

    renderizarPedidos(pedidos) {
        this.pedidosGrid.innerHTML = '';
        
        if (pedidos.length === 0) {
            this.pedidosGrid.appendChild(this.noPedidos.cloneNode(true));
            return;
        }
        
        pedidos.forEach(pedido => {
            const card = this.criarCardPedido(pedido);
            this.pedidosGrid.appendChild(card);
        });
    }

    criarCardPedido(pedido) {
        const status = this.statusInfo[pedido.status];
        const dataFormatada = this.formatarData(pedido.data);
        
        const card = document.createElement('div');
        card.className = 'pedido-card';
        card.innerHTML = `
            <div class="pedido-header">
                <div class="pedido-info">
                    <h3>${this.chaNomes[pedido.cha]}</h3>
                    <span class="pedido-id-display">${pedido.idCompra}</span>
                </div>
                <div class="pedido-status" style="background-color: ${status.cor}20; color: ${status.cor}; border-left-color: ${status.cor}">
                    <i class="fas ${status.icon}"></i> ${status.nome}
                </div>
            </div>
            
            <div class="pedido-cliente">
                <i class="fas fa-user"></i> ${pedido.cliente}
            </div>
            
            <div class="pedido-details">
                <div class="detail-row">
                    <span class="detail-label">Tamanho:</span>
                    <span class="detail-value">${this.tamanhoNomes[pedido.tamanho]}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Preço Unitário:</span>
                    <span class="detail-value">R$ ${pedido.preco.toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Data:</span>
                    <span class="detail-value">${dataFormatada}</span>
                </div>
            </div>
            
            ${pedido.observacoes ? `
                <div class="pedido-obs">
                    <strong>Observações:</strong> ${pedido.observacoes}
                </div>
            ` : ''}
            
            <div class="pedido-footer">
                <div class="pedido-total">R$ ${pedido.preco.toFixed(2)}</div>
                <div class="pedido-actions">
                    <div class="status-selector">
                        <select class="status-select" data-id="${pedido.id}">
                            <option value="pendente" ${pedido.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                            <option value="preparando" ${pedido.status === 'preparando' ? 'selected' : ''}>Preparando</option>
                            <option value="pronto" ${pedido.status === 'pronto' ? 'selected' : ''}>Pronto</option>
                            <option value="entregue" ${pedido.status === 'entregue' ? 'selected' : ''}>Entregue</option>
                        </select>
                    </div>
                    <button class="action-btn edit-btn" data-id="${pedido.id}" title="Editar pedido">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-id="${pedido.id}" title="Excluir pedido">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Configurar eventos do card
        const deleteBtn = card.querySelector('.delete-btn');
        const editBtn = card.querySelector('.edit-btn');
        const statusSelect = card.querySelector('.status-select');
        
        deleteBtn.addEventListener('click', () => this.confirmarExclusao(pedido.id));
        editBtn.addEventListener('click', () => this.prepararEdicao(pedido));
        statusSelect.addEventListener('change', (e) => this.atualizarStatusPedido(pedido.id, e.target.value));
        
        return card;
    }

    async atualizarStatusPedido(id, novoStatus) {
        try {
            const pedidoAtualizado = await this.pedidoService.atualizarStatusPedido(id, novoStatus);
            if (pedidoAtualizado) {
                this.toastService.mostrar(
                    `Status do pedido ${pedidoAtualizado.idCompra} atualizado para: ${this.statusInfo[novoStatus].nome}`,
                    'info'
                );
                await this.atualizarInterface();
            }
        } catch (error) {
            this.toastService.mostrar(`Erro ao atualizar status: ${error.message}`, 'erro');
        }
    }

    async confirmarExclusao(id) {
        if (confirm('Tem certeza que deseja excluir este pedido?')) {
            try {
                const pedidoExcluido = await this.pedidoService.excluirPedido(id);
                if (pedidoExcluido) {
                    this.toastService.mostrar(
                        `Pedido ${pedidoExcluido.idCompra} excluído com sucesso!`,
                        'aviso'
                    );
                    await this.atualizarInterface();
                }
            } catch (error) {
                this.toastService.mostrar(`Erro ao excluir pedido: ${error.message}`, 'erro');
            }
        }
    }

    async limparTodosPedidos() {
        const quantidade = await this.pedidoService.obterEstatisticas();
        if (quantidade.total === 0) {
            this.toastService.mostrar('Não há pedidos para limpar.', 'info');
            return;
        }
        
        if (confirm(`Tem certeza que deseja excluir TODOS os ${quantidade.total} pedidos? Esta ação não pode ser desfeita.`)) {
            try {
                const quantidadeExcluida = await this.pedidoService.limparTodosPedidos();
                this.toastService.mostrar(
                    `${quantidadeExcluida} pedidos foram removidos com sucesso!`,
                    'aviso'
                );
                await this.atualizarInterface();
            } catch (error) {
                this.toastService.mostrar(`Erro ao limpar pedidos: ${error.message}`, 'erro');
            }
        }
    }

    // Interface
    async atualizarInterface() {
        try {
            // Atualizar estatísticas
            const estatisticas = await this.pedidoService.obterEstatisticas();
            this.totalPedidos.textContent = estatisticas.total;
            this.pedidosHoje.textContent = estatisticas.hoje;
            this.receitaHoje.textContent = `R$ ${estatisticas.receitaHoje.toFixed(2)}`;
            this.totalReceita.textContent = `R$ ${estatisticas.receitaTotal.toFixed(2)}`;
            
            // Atualizar lista se estiver visível
            if (this.verPedidosSection.classList.contains('active')) {
                await this.atualizarListaPedidos();
            }
        } catch (error) {
            console.error('Erro ao atualizar interface:', error);
        }
    }

    // Utilitários
    formatarData(dataString) {
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    atualizarDataHora() {
        const agora = new Date();
        this.dataHora.textContent = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR');
    }
}

// Inicializar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new PedidoController();
});