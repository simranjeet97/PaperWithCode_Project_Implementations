const { createApp, ref, computed, onMounted, nextTick } = Vue;

createApp({
  setup() {
    const currentTxId = ref('');
    const txStatus = ref('INITIALIZED');
    const wsConnected = ref(false);
    const isRunning = ref(false);
    const failureReason = ref('');
    
    // View Switcher: 'chat' | 'inspector'
    const currentView = ref('chat');

    // Client Chat & Planning
    const chatMessages = ref([]);
    const userChatInput = ref('');
    const isPlanning = ref(false);
    const chatFaultSimulation = ref(true);

    // Scenarios & Fault Injections
    const faultInjectionRefund = ref(true);
    const faultInjectionWollaston = ref(true);
    const playbackSpeed = ref(0.7);
    const audioEnabled = ref(true);

    // Custom Transaction Inputs
    const customInitialBalance = ref(500.0);
    const customMutationAmount = ref(150.0);
    const customShouldFail = ref(true);
    
    // Models
    const availableModels = ref(['qwen2.5:7b', 'gemma:2b', 'gemma2:2b', 'gemma:7b']);
    const selectedModel = ref('qwen2.5:7b');

    // Records & Timeline
    const records = ref([]);
    const snapshots = ref({}); // step_index -> snapshot
    const events = ref([]);
    const activeTab = ref('database');

    // Time Travel Scrubber
    const currentScrubStep = ref(0);
    const maxStep = ref(4);
    const isTimeTravelMode = ref(false);
    const scrubbedSnapshot = ref(null);

    // Audio Synthesizer Context
    let audioCtx = null;

    const playSound = (type) => {
      if (!audioEnabled.value) return;
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;
        if (type === 'click') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
        } else if (type === 'commit') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, now); // C5
          osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
        } else if (type === 'fail') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.linearRampToValueAtTime(110, now + 0.3);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
        } else if (type === 'compensate') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
        }
      } catch (e) {
        // Audio policy ignore
      }
    };

    const toggleAudio = () => {
      audioEnabled.value = !audioEnabled.value;
      if (audioEnabled.value) playSound('click');
    };

    // WebSocket instance
    let socket = null;

    const refreshIcons = () => {
      nextTick(() => {
        if (window.lucide) {
          window.lucide.createIcons();
        }
      });
    };

    // Hero metrics
    const heroMetrics = computed(() => {
      let beforeBalance = 100.0;
      let beforeStock = 4;
      let currentBalance = 100.0;
      let currentStock = 4;
      let restoredBalance = 100.0;
      let restoredStock = 4;

      const snap0 = snapshots.value[0];
      if (snap0 && snap0.database_state) {
        const custs = Object.values(snap0.database_state.customers || {});
        if (custs.length > 0) beforeBalance = custs[0].balance ?? 100.0;
        const invs = Object.values(snap0.database_state.inventory || {});
        if (invs.length > 0) beforeStock = invs[0].stock ?? 4;
      }

      const active = activeSnapshot.value;
      if (active && active.database_state) {
        const custs = Object.values(active.database_state.customers || {});
        if (custs.length > 0) currentBalance = custs[0].balance ?? beforeBalance;
        const invs = Object.values(active.database_state.inventory || {});
        if (invs.length > 0) currentStock = invs[0].stock ?? beforeStock;
      }

      if (txStatus.value === 'ROLLED_BACK') {
        const snapFinal = snapshots.value[999] || snapshots.value[0];
        if (snapFinal && snapFinal.database_state) {
          const custs = Object.values(snapFinal.database_state.customers || {});
          if (custs.length > 0) restoredBalance = custs[0].balance ?? beforeBalance;
          const invs = Object.values(snapFinal.database_state.inventory || {});
          if (invs.length > 0) restoredStock = invs[0].stock ?? beforeStock;
        }
      }

      return {
        beforeBalance: Number(beforeBalance).toFixed(2),
        beforeStock,
        currentBalance: Number(currentBalance).toFixed(2),
        currentStock,
        restoredBalance: Number(restoredBalance).toFixed(2),
        restoredStock
      };
    });

    const activeSnapshot = computed(() => {
      if (isTimeTravelMode.value && scrubbedSnapshot.value) {
        return scrubbedSnapshot.value;
      }
      const snapKeys = Object.keys(snapshots.value).map(Number).sort((a, b) => a - b);
      if (snapKeys.length > 0) {
        const highest = snapKeys[snapKeys.length - 1];
        return snapshots.value[highest];
      }
      return null;
    });

    const currentDbState = computed(() => {
      return activeSnapshot.value?.database_state || {
        customers: { cust_101: { id: "cust_101", name: "Alice Walker", balance: 100.0 } },
        inventory: { item_99: { sku: "item_99", name: "Mechanical Keyboard", stock: 4 } },
        orders: { ord_882: { id: "ord_882", amount: 100.0, status: "COMPLETED" } }
      };
    });

    const currentApiCalls = computed(() => {
      return activeSnapshot.value?.external_api_calls || [];
    });

    const currentMemoryNodes = computed(() => {
      return activeSnapshot.value?.agent_memory_nodes || [
        { id: "node_1", type: "TASK", label: "Customer Refund Protocol", status: "ACTIVE" }
      ];
    });

    const currentFiles = computed(() => {
      return activeSnapshot.value?.workspace_files || {
        "/workspace/manifest.json": '{"version": "1.0", "task": "acid_agent_execution"}'
      };
    });

    const currentLlmTrace = computed(() => {
      const snap = activeSnapshot.value;
      if (snap && snap.llm_trace) {
        return snap.llm_trace;
      }
      // Check latest record
      const rec = records.value[records.value.length - 1];
      if (rec && rec.llm_trace) {
        return rec.llm_trace;
      }
      return {
        model_used: selectedModel.value,
        thought: "Verified pre-condition invariants against isolated sandbox. Preserving write-ahead action log.",
        decision: "proceed",
        action: "execute_staged_unit",
        confidence: 0.95,
        duration_ms: 320,
        tokens_eval: 64,
        prompt_sent: `System: You are an ACID-compliant transaction-aware AI agent.\nContext: {\n  "balance": 1000.0,\n  "status": "active"\n}\nTask: Verify eligibility and execute staged action.\nRespond strictly in JSON with format: {"thought": "...", "decision": "proceed", "action": "execute_staged_unit", "confidence_logprob": 0.95}`,
        raw_response: JSON.stringify({
          thought: "Verified pre-condition invariants against isolated sandbox. Preserving write-ahead action log.",
          decision: "proceed",
          action: "execute_staged_unit",
          confidence_logprob: 0.95
        }, null, 2)
      };
    });

    const displayedRecords = computed(() => {
      if (records.value.length > 0) {
        return records.value;
      }
      return [
        { step_index: 1, step_name: 'Read Order & Customer Profile', action_type: 'READ', status: 'PENDING', confidence_score: 0.95, divergence_score: 0.92 },
        { step_index: 2, step_name: 'Restock Inventory Unit (+1)', action_type: 'DB_MUTATION', status: 'PENDING', confidence_score: 0.94, divergence_score: 0.90, compensation: { action_name: 'Compensate: Revert Restock' } },
        { step_index: 3, step_name: 'Issue Payment Refund ($100.00)', action_type: 'API_CALL', status: 'PENDING', confidence_score: 0.96, divergence_score: 0.95, compensation: { action_name: 'Compensate: Void Refund' } },
        { step_index: 4, step_name: 'Dispatch Confirmation Notification', action_type: 'API_CALL', status: 'PENDING', confidence_score: 0.91, divergence_score: 0.88 }
      ];
    });

    const reversedEvents = computed(() => {
      return [...events.value].reverse();
    });

    const statusBadgeClass = computed(() => {
      switch (txStatus.value) {
        case 'COMMITTED': return 'badge-success-commit';
        case 'FAILED': return 'badge-rollback-alarm';
        case 'COMPENSATING': return 'badge-compensating animate-pulse';
        case 'ROLLED_BACK': return 'badge-rollback-alarm shadow-lg shadow-rose-500/20';
        case 'RUNNING': return 'badge-live-stream animate-pulse';
        default: return 'bg-slate-800 text-slate-400 border border-slate-700';
      }
    });

    const getStepCardClass = (rec) => {
      if (rec.status === 'COMMITTED') return 'bg-slate-900/90 border-emerald-500/40 shadow-sm shadow-emerald-500/10';
      if (rec.status === 'FAILED') return 'bg-rose-950/60 border-rose-500/70 pulse-failure shadow-md shadow-rose-950/60';
      if (rec.status === 'COMPENSATING') return 'bg-amber-950/40 border-amber-500/60';
      if (rec.status === 'COMPENSATED') return 'bg-slate-900/60 border-slate-700 opacity-80';
      if (rec.status === 'RUNNING') return 'bg-slate-900 border-cyan-500/60 shadow-md shadow-cyan-500/25';
      return 'bg-slate-900/40 border-slate-800 opacity-60';
    };

    const getStepIconBadgeClass = (rec) => {
      if (rec.status === 'COMMITTED') return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
      if (rec.status === 'FAILED') return 'bg-rose-500/25 text-rose-300 border border-rose-500/50';
      if (rec.status === 'COMPENSATING') return 'bg-amber-500/20 text-amber-400 border border-amber-500/40';
      if (rec.status === 'COMPENSATED') return 'bg-slate-800 text-slate-400 border border-slate-700';
      if (rec.status === 'RUNNING') return 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse';
      return 'bg-slate-800 text-slate-500 border border-slate-700';
    };

    const getStepStatusBadgeClass = (rec) => {
      if (rec.status === 'COMMITTED') return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      if (rec.status === 'FAILED') return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
      if (rec.status === 'COMPENSATING') return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      if (rec.status === 'COMPENSATED') return 'bg-slate-800 text-slate-400 border border-slate-700';
      if (rec.status === 'RUNNING') return 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30';
      return 'bg-slate-800 text-slate-500';
    };

    const getEventColorClass = (type) => {
      if (type.includes('COMMITTED')) return 'text-emerald-400';
      if (type.includes('FAILED') || type.includes('ROLLED_BACK')) return 'text-rose-400';
      if (type.includes('COMPENSATION') || type.includes('ROLLBACK')) return 'text-amber-400';
      return 'text-cyan-400';
    };

    const formatTime = (ts) => {
      if (!ts) return '';
      const date = new Date(ts * 1000);
      return date.toTimeString().split(' ')[0];
    };

    // WebSocket Management
    const connectWebSocket = (txId) => {
      if (socket) {
        socket.close();
      }
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/ws/transaction/${txId}`;
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        wsConnected.value = true;
      };

      socket.onclose = () => {
        wsConnected.value = false;
      };

      socket.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        handleIncomingEvent(data);
      };
    };

    const handleIncomingEvent = (event) => {
      events.value.push(event);

      if (event.event_type === 'INITIAL_HISTORY') {
        records.value = event.records || [];
        if (event.snapshots) {
          event.snapshots.forEach(s => {
            snapshots.value[s.step_index] = s;
          });
        }
        txStatus.value = event.status || 'INITIALIZED';
        refreshIcons();
        return;
      }

      if (event.event_type === 'STEP_STARTED') {
        playSound('click');
        txStatus.value = 'RUNNING';
        const stepIdx = event.step_index;
        maxStep.value = Math.max(maxStep.value, stepIdx);
        let rec = records.value.find(r => r.step_index === stepIdx);
        if (!rec) {
          rec = {
            step_index: stepIdx,
            step_name: event.step_name,
            action_type: event.payload?.action_type || 'TOOL_CALL',
            status: 'RUNNING',
            confidence_score: 0.95,
            divergence_score: 0.88
          };
          records.value.push(rec);
        } else {
          rec.status = 'RUNNING';
        }
      } else if (event.event_type === 'STEP_COMMITTED') {
        playSound('commit');
        const stepIdx = event.step_index;
        const rec = records.value.find(r => r.step_index === stepIdx);
        if (rec) {
          rec.status = 'COMMITTED';
          if (event.payload?.snapshot) {
            snapshots.value[stepIdx] = event.payload.snapshot;
          }
        }
      } else if (event.event_type === 'STEP_FAILED') {
        playSound('fail');
        txStatus.value = 'FAILED';
        failureReason.value = event.message;
        const stepIdx = event.step_index;
        const rec = records.value.find(r => r.step_index === stepIdx);
        if (rec) {
          rec.status = 'FAILED';
        }
      } else if (event.event_type === 'TX_ROLLBACK_STARTED') {
        playSound('fail');
        txStatus.value = 'COMPENSATING';
      } else if (event.event_type === 'COMPENSATION_STEP') {
        playSound('compensate');
        const stepIdx = event.payload?.step_index;
        const rec = records.value.find(r => r.step_index === stepIdx);
        if (rec) {
          rec.status = 'COMPENSATING';
          setTimeout(() => {
            rec.status = 'COMPENSATED';
            refreshIcons();
          }, 300);
        }
      } else if (event.event_type === 'TX_ROLLED_BACK') {
        playSound('commit');
        txStatus.value = 'ROLLED_BACK';
        isRunning.value = false;
        if (event.payload?.restored_snapshot) {
          snapshots.value[999] = event.payload.restored_snapshot;
        }
      } else if (event.event_type === 'TX_COMMITTED') {
        playSound('commit');
        txStatus.value = 'COMMITTED';
        isRunning.value = false;
        if (event.payload?.final_snapshot) {
          const s = event.payload.final_snapshot;
          snapshots.value[s.step_index] = s;
        }
      } else if (event.event_type === 'TIME_TRAVEL_STATE') {
        scrubbedSnapshot.value = event.snapshot;
      }

      refreshIcons();
    };

    // Actions
    const runScenario = async (scenarioType, fault) => {
      playSound('click');
      isRunning.value = true;
      isTimeTravelMode.value = false;
      records.value = [];
      events.value = [];
      snapshots.value = {};
      failureReason.value = '';
      txStatus.value = 'RUNNING';

      try {
        const res = await fetch('/api/run-scenario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenario_type: scenarioType,
            fault_injection: fault,
            model_name: selectedModel.value,
            step_delay: playbackSpeed.value
          })
        });
        const data = await res.json();
        currentTxId.value = data.tx_id;
        connectWebSocket(data.tx_id);
      } catch (err) {
        console.error('Failed to run scenario:', err);
        isRunning.value = false;
      }
    };

    const runCustomTransaction = async () => {
      playSound('click');
      isRunning.value = true;
      isTimeTravelMode.value = false;
      records.value = [];
      events.value = [];
      snapshots.value = {};
      failureReason.value = '';
      txStatus.value = 'RUNNING';

      try {
        const res = await fetch('/api/run-custom-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_name: `Custom Transaction: User Balance & Ledger Mutate`,
            customer_id: "cust_custom_99",
            customer_name: "Custom Enterprise Account",
            initial_balance: customInitialBalance.value,
            initial_stock: 20,
            model_name: selectedModel.value,
            step_delay: playbackSpeed.value,
            steps: [
              {
                step_name: "Authorize & Verify Ledger Line",
                action_type: "READ",
                mutation_target: "balance",
                mutation_value: 0.0,
                should_fail: false
              },
              {
                step_name: `Apply Debit Mutation (-$${customMutationAmount.value})`,
                action_type: "DB_MUTATION",
                mutation_target: "balance",
                mutation_value: customMutationAmount.value,
                should_fail: false
              },
              {
                step_name: "Allocate Custom Resource Units",
                action_type: "DB_MUTATION",
                mutation_target: "inventory",
                mutation_value: 3.0,
                should_fail: false
              },
              {
                step_name: "Dispatch Third-Party Webhook Sync",
                action_type: "API_CALL",
                mutation_target: "api",
                mutation_value: 0.0,
                should_fail: customShouldFail.value,
                fail_message: "503 Service Unavailable: Downstream Webhook Gateway Deadlock"
              }
            ]
          })
        });
        const data = await res.json();
        currentTxId.value = data.tx_id;
        connectWebSocket(data.tx_id);
      } catch (err) {
        console.error('Failed to run custom transaction:', err);
        isRunning.value = false;
      }
    };

    const triggerManualRollback = async () => {
      if (!currentTxId.value) return;
      playSound('fail');
      try {
        await fetch(`/api/transaction/${currentTxId.value}/rollback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'User Manual Rollback Override' })
        });
      } catch (err) {
        console.error('Failed to trigger rollback:', err);
      }
    };

    // Scrubber Logic
    const onScrubInput = () => {
      playSound('click');
      isTimeTravelMode.value = true;
      const step = currentScrubStep.value;
      if (snapshots.value[step]) {
        scrubbedSnapshot.value = snapshots.value[step];
      } else if (socket && wsConnected.value) {
        socket.send(JSON.stringify({
          action: 'SCRUB_TIME_TRAVEL',
          step_index: step
        }));
      }
      refreshIcons();
    };

    const scrubToStep = (step) => {
      currentScrubStep.value = step;
      onScrubInput();
    };

    const scrubToLive = () => {
      playSound('click');
      isTimeTravelMode.value = false;
      scrubbedSnapshot.value = null;
      currentScrubStep.value = maxStep.value;
      refreshIcons();
    };

    // Chat & Planning Methods
    const submitChatMessage = async () => {
      const text = userChatInput.value.trim();
      if (!text || isPlanning.value) return;
      playSound('click');

      chatMessages.value.push({ role: 'user', content: text });
      userChatInput.value = '';
      isPlanning.value = true;

      try {
        const res = await fetch('/api/chat-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_message: text,
            model_name: selectedModel.value
          })
        });
        const data = await res.json();
        chatMessages.value.push({
          role: 'assistant',
          content: `I have analyzed your request: "${text}". Here is the verified transactional execution plan:`,
          plan: data.plan,
          scenario_type: data.scenario_type,
          llm_trace: data.llm_trace,
          show_raw_trace: false
        });
      } catch (err) {
        chatMessages.value.push({
          role: 'assistant',
          content: `Unable to generate plan: ${err.message}`
        });
      } finally {
        isPlanning.value = false;
        refreshIcons();
      }
    };

    const sendPresetMessage = (preset) => {
      userChatInput.value = preset;
      submitChatMessage();
    };

    const approveAndExecutePlan = async (scenarioType) => {
      playSound('commit');
      if (scenarioType === 'vacation_booking') {
        await runScenario('vacation_booking', chatFaultSimulation.value);
      } else if (scenarioType === 'ecommerce_refund') {
        await runScenario('ecommerce_refund', chatFaultSimulation.value);
      } else {
        await runCustomTransaction();
      }
      // Add execution notice to chat
      chatMessages.value.push({
        role: 'assistant',
        content: `⚡ Transaction approved and executing live on the ACID engine... Check the live progress card on the right!`
      });
      refreshIcons();
    };

    const resetChat = () => {
      chatMessages.value = [];
      refreshIcons();
    };

    const loadModels = async () => {
      try {
        const res = await fetch('/api/models');
        if (res.ok) {
          const data = await res.json();
          if (data.models && data.models.length > 0) {
            availableModels.value = data.models;
            selectedModel.value = data.recommended || data.models[0];
          }
        }
      } catch (e) {
        console.warn('Could not load models list:', e);
      }
    };

    onMounted(() => {
      loadModels();
      refreshIcons();
    });

    return {
      currentTxId,
      txStatus,
      wsConnected,
      isRunning,
      failureReason,
      currentView,
      chatMessages,
      userChatInput,
      isPlanning,
      chatFaultSimulation,
      submitChatMessage,
      sendPresetMessage,
      approveAndExecutePlan,
      resetChat,
      faultInjectionRefund,
      faultInjectionWollaston,
      playbackSpeed,
      audioEnabled,
      toggleAudio,
      customInitialBalance,
      customMutationAmount,
      customShouldFail,
      runCustomTransaction,
      availableModels,
      selectedModel,
      records,
      snapshots,
      events,
      activeTab,
      currentScrubStep,
      maxStep,
      isTimeTravelMode,
      heroMetrics,
      activeSnapshot,
      currentDbState,
      currentApiCalls,
      currentMemoryNodes,
      currentFiles,
      currentLlmTrace,
      displayedRecords,
      reversedEvents,
      statusBadgeClass,
      getStepCardClass,
      getStepIconBadgeClass,
      getStepStatusBadgeClass,
      getEventColorClass,
      formatTime,
      runScenario,
      triggerManualRollback,
      onScrubInput,
      scrubToStep,
      scrubToLive
    };
  }
}).mount('#app');
