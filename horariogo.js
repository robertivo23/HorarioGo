        function triggerAlarmModal(task) {
            document.getElementById('alarm-task-name').innerHTML = `${task.icon.includes('fa-') ? '<i class="'+task.icon+' mr-2"></i>' : task.icon + ' '} ${task.task}`;
            document.getElementById('alarm-task-time').textContent = `${format12h(task.start)} - ${format12h(task.end)}`;
            document.getElementById('alarm-modal').classList.add('active');
            
            showSystemNotification(
                `¡Nueva Actividad! - ${task.task}`, 
                `Iniciando ahora: ${format12h(task.start)} - ${format12h(task.end)}\n${task.desc || ''}`,
                "HorarioGo-logo.svg"
            );
            
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                const ctx = new AudioContext();
                function beep() {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(800, ctx.currentTime);
                    gain.gain.setValueAtTime(0.05, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.1);
                }
                beep(); setTimeout(beep, 150); setTimeout(beep, 300);
            } catch (e) {}
        }

        function closeAlarmModal() {
            document.getElementById('alarm-modal').classList.remove('active');
        }

        let swRegistration = null;

        function showSystemNotification(title, body, icon) {
            if (!("Notification" in window) || Notification.permission !== "granted") return;
            const options = { body, icon, requireInteraction: true, vibrate: [200, 100, 200, 100, 200] };
            if (swRegistration && swRegistration.showNotification) {
                swRegistration.showNotification(title, options).catch(() => {
                    try { new Notification(title, options); } catch (e) {}
                });
            } else {
                try { new Notification(title, options); } catch (e) {}
            }
        }

        function requestNotificationPermission() {
            if (!("Notification" in window)) {
                alert("Tu navegador no soporta notificaciones. En Apple/iOS, añade la web a la Pantalla de Inicio (Compartir > Añadir a Inicio) primero.");
                return;
            }
            
            const handlePerm = (perm) => {
                if (!('permission' in Notification)) Notification.permission = perm;
                if (perm === "granted") {
                    showSystemNotification("Horario Go", "¡Notificaciones activadas correctamente!", "HorarioGo-logo.svg");
                    updateNotifyButton();
                } else if (perm === "denied") {
                    alert("Permiso denegado. Puedes cambiarlo en la configuración del navegador.");
                }
            };

            if (Notification.permission === "granted") {
                alert("Las notificaciones ya están activadas.");
            } else if (Notification.permission !== "denied") {
                const p = Notification.requestPermission(handlePerm);
                if (p) p.then(handlePerm);
            }
        }

        function updateNotifyButton() {
            const btn = document.getElementById('notify-toggle');
            if (btn && "Notification" in window) {
                if (Notification.permission === "granted") {
                    btn.classList.add('bg-amber-500/40', 'border-amber-500');
                    btn.innerHTML = '<i class="fa-solid fa-bell-slash mr-1"></i> ALERTAS ON';
                } else {
                    btn.classList.remove('bg-amber-500/40', 'border-amber-500');
                    btn.innerHTML = '<i class="fa-solid fa-bell mr-1"></i> ALERTAS OFF';
                }
            }
        }

        let globalUserName = localStorage.getItem('horario_username') || "Rooxitos";

        function openProfileModal() {
            document.getElementById('edit-profile-name').value = globalUserName;
            document.getElementById('profile-modal').classList.add('active');
            setTimeout(() => document.getElementById('edit-profile-name').focus(), 100);
        }

        function closeProfileModal() {
            document.getElementById('profile-modal').classList.remove('active');
        }

        function saveProfile() {
            const newName = document.getElementById('edit-profile-name').value.trim();
            if (newName) {
                globalUserName = newName;
                localStorage.setItem('horario_username', globalUserName);
                updateClock();
            }
            closeProfileModal();
        }

        let isEditMode = false;
        let currentEditingDay = new Date().getDay();
        let editingIndex = -1;
        let isDailyTask = false;
        let lastActiveTaskIdentifier = null;

        const defaultSchedule = {
            daily: [
                { start: "22:30", end: "06:30", task: "Sueño Profundo", icon: "fa-solid fa-moon", cat: "cat-sleep", desc: "Descanso vital para recuperación mental (8h)" },
                { start: "07:00", end: "12:00", task: "Programación / Dev", icon: "fa-solid fa-laptop-code", cat: "cat-work", desc: "Bloque de alta concentración y código" },
                { start: "12:00", end: "13:00", task: "Almuerzo & Break", icon: "fa-solid fa-utensils", cat: "cat-sleep", desc: "Nutrición y desconexión breve" },
                { start: "13:00", end: "14:30", task: "Estudio Biblia LSC", icon: "fa-solid fa-book-open", cat: "cat-spiritual", desc: "Crecimiento espiritual en lengua de señas" }
            ],
            days: {
                1: [ { start: "15:00", end: "19:00", task: "Ejercicio / Deporte", icon: "fa-solid fa-dumbbell", cat: "cat-health", desc: "Actividad física de alto rendimiento" }, { start: "19:00", end: "22:30", task: "Comunidad Sorda / Gaming", icon: "fa-solid fa-gamepad", cat: "cat-social", desc: "Interacción y diversión en LSC" } ],
                2: [ { start: "18:00", end: "19:45", task: "Reunión (Salón)", icon: "fa-solid fa-people-roof", cat: "cat-spiritual", desc: "Actividad congregacional" }, { start: "19:45", end: "22:30", task: "Comunidad Sorda", icon: "fa-solid fa-sign-language", cat: "cat-social", desc: "Interacción post-reunión" } ],
                3: [ { start: "15:00", end: "19:00", task: "Ejercicio / Deporte", icon: "fa-solid fa-dumbbell", cat: "cat-health", desc: "Sesión de entrenamiento" }, { start: "19:00", end: "22:30", task: "Comunidad Sorda", icon: "fa-solid fa-sign-language", cat: "cat-social", desc: "Noche de competencia" } ],
                4: [ { start: "15:30", end: "19:00", task: "Predicación", icon: "fa-solid fa-door-open", cat: "cat-spiritual", desc: "Actividad ministerial" }, { start: "19:00", end: "22:30", task: "Social / Comunidad", icon: "fa-solid fa-sign-language", cat: "cat-social", desc: "Noche de interacción" } ],
                5: [ { start: "15:00", end: "19:00", task: "Ejercicio / Deporte", icon: "fa-solid fa-dumbbell", cat: "cat-health", desc: "Cierre deportivo" }, { start: "19:00", end: "22:30", task: "Comunidad Sorda", icon: "fa-solid fa-sign-language", cat: "cat-social", desc: "Interacción nocturna" } ],
                6: [ { start: "16:00", end: "18:00", task: "Reunión Atalaya (Salón)", icon: "fa-solid fa-people-roof", cat: "cat-spiritual", desc: "Reunión pública y estudio de La Atalaya" }, { start: "18:00", end: "22:30", task: "Flexible / Social", icon: "fa-solid fa-star", cat: "cat-social", desc: "Noche adaptable", flexible: true } ],
                0: [ { start: "07:00", end: "13:00", task: "Actividad Rotativa", icon: "fa-solid fa-leaf", cat: "cat-health", desc: "Fútbol o Naturaleza" }, { start: "19:00", end: "22:30", task: "Comunidad Sorda", icon: "fa-solid fa-sign-language", cat: "cat-social", desc: "Cierre de semana" } ]
            }
        };

        const defaultWisdom = [
            {
                quote: "“El entrenamiento corporal es provechoso para poco, pero la devoción piadosa es provechosa para todas las cosas.”",
                cite: "— 1 Timoteo 4:8",
                video: "https://www.jw.org/finder?wtlocale=LSC&pub=nwt&srctype=wol&bible=54004008&srcid=share",
                reflection: "👉 El equilibrio entre el cuerpo y la espiritualidad."
            },
            {
                quote: "“Cualquier cosa que hagan, háganlo de toda alma como para Jehová, y no para los hombres.”",
                cite: "— Colosenses 3:23-24",
                video: "https://www.jw.org/finder?wtlocale=LSC&pub=nwt&srctype=wol&bible=51003023&srcid=share",
                reflection: "👉 Da tu máximo esfuerzo en todo lo que hagas hoy."
            },
            {
                quote: "“...Entrénate con la devoción piadosa como tu meta.”",
                cite: "— 1 Timoteo 4:7",
                video: "https://www.jw.org/finder?wtlocale=LSC&pub=nwt&srctype=wol&bible=54004007&srcid=share",
                reflection: "👉 La disciplina espiritual requiere práctica constante."
            },
            {
                quote: "“Pero los que esperan en Jehová recobrarán fuerzas. Se elevarán con alas como águilas.”",
                cite: "— Isaías 40:31",
                video: "https://www.jw.org/finder?wtlocale=LSC&pub=nwt&srctype=wol&bible=23040031&srcid=share",
                reflection: "👉 Cuando te sientas cansado, confía en la fuerza de Dios."
            },
            {
                quote: "“...Corramos con aguante la carrera que tenemos por delante.”",
                cite: "— Hebreos 12:1",
                video: "https://www.jw.org/finder?wtlocale=LSC&pub=nwt&srctype=wol&bible=58012001&srcid=share",
                reflection: "👉 Mantén la vista en la meta y no te rindas."
            },
            {
                quote: "“Ninguna disciplina parece ser causa de gozo al presente... sin embargo, después da fruto apacible.”",
                cite: "— Hebreos 12:11",
                video: "https://www.jw.org/finder?wtlocale=LSC&pub=nwt&srctype=wol&bible=58012011&srcid=share",
                reflection: "👉 El esfuerzo de hoy valdrá la pena mañana."
            },
            {
                quote: "“Además, todo el que participa en una competencia ejerce autodominio en todas las cosas.”",
                cite: "— 1 Corintios 9:25",
                video: "https://www.jw.org/finder?wtlocale=LSC&pub=nwt&srctype=wol&bible=46009025&srcid=share",
                reflection: "👉 El control de uno mismo es la clave del éxito."
            },
            {
                quote: "“Confía en Jehová con todo tu corazón.”",
                cite: "— Proverbios 3:5",
                video: "https://www.jw.org/finder?wtlocale=LSC&pub=nwt&srctype=wol&bible=20003005&srcid=share",
                reflection: "👉 No dependas solo de tu fuerza o inteligencia."
            },
            {
                quote: "“Todo lo puedo en aquel que me fortalece.”",
                cite: "— Filipenses 4:13",
                video: "https://www.jw.org/finder?wtlocale=LSC&pub=nwt&srctype=wol&bible=50004013&srcid=share",
                reflection: "👉 No es solo trabajar duro, es confiar en Dios cuando te cansas."
            },
            {
                quote: "“Peleo, no como quien golpea al aire.”",
                cite: "— 1 Corintios 9:26-27",
                video: "https://www.jw.org/finder?wtlocale=LSC&pub=nwt&srctype=wol&bible=46009026&srcid=share",
                reflection: "👉 No vivas sin dirección. Todo lo que haces tiene objetivo."
            },
            {
                quote: "“Vengan a mí... y yo los haré descansar.”",
                cite: "— Mateo 11:28",
                video: "https://www.jw.org/finder?wtlocale=LSC&pub=nwt&srctype=wol&bible=40011028&srcid=share",
                reflection: "👉 No todo es productividad. Dios también quiere que descanses."
            },
            {
                quote: "“No nos cansemos de hacer el bien.”",
                cite: "— Gálatas 6:9",
                video: "https://www.jw.org/finder?wtlocale=LSC&pub=nwt&srctype=wol&bible=48006009&srcid=share",
                reflection: "👉 La constancia es la clave del éxito a largo plazo."
            }
        ];

        let storedSchedule = JSON.parse(localStorage.getItem('horarioGoData'));
        let scheduleData = storedSchedule || defaultSchedule;
        
        let storedWisdom = JSON.parse(localStorage.getItem('horarioGoWisdom'));
        
        // Data Migration: If stored data has Drive links or is old, reset to Default JW links
        let wisdomData = (storedWisdom && storedWisdom.length === 12 && !storedWisdom[0].video.includes('drive.google.com')) ? storedWisdom : defaultWisdom;
        
        let currentWisdomIndex = 0;

        function format12h(timeStr) {
            if (!timeStr) return "";
            let [h, m] = timeStr.split(':');
            h = parseInt(h);
            const ampm = h >= 12 ? 'p.m.' : 'a.m.';
            h = h % 12 || 12;
            return `${h}:${m} ${ampm}`;
        }

        function saveToStorage() {
            localStorage.setItem('horarioGoData', JSON.stringify(scheduleData));
            localStorage.setItem('horarioGoWisdom', JSON.stringify(wisdomData));
        }

        function exportData() {
            const data = {
                schedule: scheduleData,
                wisdom: wisdomData,
                exportDate: new Date().toISOString(),
                version: "2.0"
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `horario_go_backup_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }

        function importData() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = e => {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = event => {
                    try {
                        const imported = JSON.parse(event.target.result);
                        if (imported.schedule && imported.wisdom) {
                            if (confirm('¿Estás seguro de que deseas importar estos datos? Se sobrescribirá tu configuración actual.')) {
                                scheduleData = imported.schedule;
                                wisdomData = imported.wisdom;
                                saveToStorage();
                                location.reload();
                            }
                        } else {
                            alert('Formato de archivo inválido.');
                        }
                    } catch (err) {
                        alert('Error al leer el archivo.');
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        }

        function toggleEditMode() {
            isEditMode = !isEditMode;
            document.body.classList.toggle('edit-mode', isEditMode);
            document.getElementById('edit-toggle').textContent = isEditMode ? "✅ FINALIZAR EDICIÓN" : "✏️ MODO EDICIÓN";
            document.getElementById('edit-toggle').classList.toggle('bg-green-500/20', isEditMode);
            
            const addContainer = document.getElementById('add-task-container');
            if (addContainer) {
                if (isEditMode) {
                    addContainer.classList.remove('hidden');
                    addContainer.classList.add('grid');
                } else {
                    addContainer.classList.add('hidden');
                    addContainer.classList.remove('grid');
                }
            }
            renderDay(currentEditingDay);
        }

        function renderDay(dayIndex) {
            currentEditingDay = dayIndex;
            const container = document.getElementById('schedule-container');
            if (!container) return;
            container.innerHTML = '';
            
            function renderIcon(iconStr) {
                if (iconStr.includes('fa-')) return `<i class="${iconStr}"></i>`;
                return iconStr;
            }
            
            document.querySelectorAll('.day-btn').forEach((btn, idx) => {
                if (idx === dayIndex || (dayIndex === 0 && idx === 0)) {
                    btn.classList.add('bg-blue-500/40', 'border-blue-500');
                    btn.classList.remove('bg-white/5', 'border-white/10');
                } else {
                    btn.classList.remove('bg-blue-500/40', 'border-blue-500');
                    btn.classList.add('bg-white/5', 'border-white/10');
                }
            });

            const dailyTasks = scheduleData.daily.map((t, i) => ({...t, index: i, type: 'daily'}));
            const dayTasks = (scheduleData.days[dayIndex] || []).map((t, i) => ({...t, index: i, type: 'day'}));
            const combined = [...dailyTasks, ...dayTasks].sort((a, b) => a.start.localeCompare(b.start));

            combined.forEach(task => {
                const duration = getDuration(task.start, task.end);
                const card = document.createElement('div');
                card.className = `activity-card glass p-4 rounded-xl flex items-center gap-4 ${task.cat} relative group`;
                if (task.flexible) card.classList.add('border-dashed');
                
                card.onclick = () => isEditMode ? openEditModal(task.index, task.type === 'daily') : null;

                card.innerHTML = `
                    <div class="text-xl xs:text-2xl w-10 h-10 xs:w-12 xs:h-12 flex-shrink-0 flex items-center justify-center bg-white/5 rounded-lg border border-white/5 self-start sm:self-center mt-1 sm:mt-0">${renderIcon(task.icon)}</div>
                    <div class="flex-1 min-w-0">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-4 mb-1">
                            <div class="flex flex-wrap items-center gap-1.5 min-w-0">
                                <h3 class="font-bold text-white text-xs xs:text-sm md:text-base leading-tight truncate">
                                    ${task.task}
                                </h3>
                                <span class="text-[8px] xs:text-[10px] text-blue-400 font-mono">(${duration.toFixed(1)}h)</span>
                                ${task.type === 'daily' ? '<span class="text-[7px] text-slate-500 uppercase border border-white/10 px-1 rounded bg-white/5">DIARIO</span>' : ''}
                            </div>
                            <span class="mono text-[8px] xs:text-[9px] text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-white/5 whitespace-nowrap mt-1 sm:mt-0">${format12h(task.start)} - ${format12h(task.end)}</span>
                        </div>
                        <p class="text-[9px] xs:text-[10px] sm:text-[11px] text-slate-400 leading-snug line-clamp-2 sm:line-clamp-none">${task.desc}</p>
                    </div>
                    ${isEditMode ? '<div class="absolute inset-0 bg-blue-500/20 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded-xl text-blue-400 font-bold text-[10px] uppercase tracking-widest">EDITAR</div>' : ''}
                `;
                container.appendChild(card);
            });

            // Update Daily Total Header
            const totalDayHours = combined.reduce((acc, t) => acc + getDuration(t.start, t.end), 0);
            const headerTotal = document.getElementById('day-total-hours');
            if (headerTotal) headerTotal.textContent = `${totalDayHours.toFixed(1)}h planeadas hoy`;
        }

        function getDuration(start, end) {
            if (!start || !end) return 0;
            const [h1, m1] = start.split(':').map(Number);
            const [h2, m2] = end.split(':').map(Number);
            let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (diff < 0) diff += 24 * 60; // Cross midnight
            return diff / 60;
        }

        function updateCalculatedStats() {
            const stats = { 'cat-work': 0, 'cat-health': 0, 'cat-spiritual': 0, 'cat-social': 0, 'cat-sleep': 0 };
            
            // Daily tasks (x7)
            scheduleData.daily.forEach(t => {
                stats[t.cat] += getDuration(t.start, t.end) * 7;
            });
            
            // Specific day tasks
            Object.keys(scheduleData.days).forEach(day => {
                scheduleData.days[day].forEach(t => {
                    stats[t.cat] += getDuration(t.start, t.end);
                });
            });

            const totalWeek = 168;
            let totalAccounted = 0;

            // Update Top Cards and Progress Bars
            const categories = [
                { id: 'work', cat: 'cat-work' },
                { id: 'health', cat: 'cat-health' },
                { id: 'spiritual', cat: 'cat-spiritual' },
                { id: 'social', cat: 'cat-social' },
                { id: 'sleep', cat: 'cat-sleep' }
            ];

            categories.forEach(c => {
                const hours = stats[c.cat];
                const pct = ((hours / totalWeek) * 100).toFixed(1);
                totalAccounted += hours;

                const cardVal = document.getElementById(`stat-${c.id}`);
                const cardPct = document.getElementById(`stat-${c.id}-pct`);
                const barLabel = document.getElementById(`bar-${c.id}-label`);
                const barFill = document.getElementById(`bar-${c.id}`);

                if (cardVal) cardVal.textContent = `${hours.toFixed(1)}h`;
                if (cardPct) cardPct.textContent = `${pct}% SEMANA`;
                if (barLabel) barLabel.textContent = `${hours.toFixed(1)}h / ${pct}%`;
                if (barFill) barFill.style.width = `${pct}%`;
            });

            // Margin Calculation
            const marginHours = Math.max(0, totalWeek - totalAccounted);
            const marginPct = ((marginHours / totalWeek) * 100).toFixed(1);
            
            const marginEl = document.getElementById('margin-hours');
            const marginPctEl = document.getElementById('margin-pct');
            const marginCircle = document.getElementById('margin-circle');

            if (marginEl) marginEl.textContent = `${marginHours.toFixed(1)}h`;
            if (marginPctEl) marginPctEl.textContent = `${Math.round(marginPct)}%`;
            if (marginCircle) {
                const dash = 175.9;
                const offset = dash - (dash * (marginPct / 100));
                marginCircle.style.strokeDashoffset = offset;
            }
        }

        function openEditModal(index, isDaily) {
            editingIndex = index;
            isDailyTask = isDaily;
            const task = isDaily ? scheduleData.daily[index] : scheduleData.days[currentEditingDay][index];
            
            document.getElementById('edit-task-name').value = task.task;
            document.getElementById('edit-start').value = task.start;
            document.getElementById('edit-end').value = task.end;
            document.getElementById('edit-icon').value = task.icon;
            document.getElementById('edit-desc').value = task.desc;
            document.getElementById('edit-cat').value = task.cat;
            
            document.getElementById('edit-modal').classList.add('active');
        }

        function saveEdit() {
            const updated = {
                task: document.getElementById('edit-task-name').value,
                start: document.getElementById('edit-start').value,
                end: document.getElementById('edit-end').value,
                icon: document.getElementById('edit-icon').value,
                desc: document.getElementById('edit-desc').value,
                cat: document.getElementById('edit-cat').value
            };

            if (isDailyTask) scheduleData.daily[editingIndex] = updated;
            else scheduleData.days[currentEditingDay][editingIndex] = updated;

            saveToStorage();
            closeModal();
            renderDay(currentEditingDay);
            updateLiveActivity();
            updateCalculatedStats();
        }

        function addNewTask(isDaily = false) {
            const newTask = { start: "12:00", end: "13:00", task: "Nueva Actividad", icon: "fa-solid fa-star", cat: "cat-work", desc: "Descripción" };
            if (isDaily) {
                scheduleData.daily.push(newTask);
                openEditModal(scheduleData.daily.length - 1, true);
            } else {
                if (!scheduleData.days[currentEditingDay]) scheduleData.days[currentEditingDay] = [];
                scheduleData.days[currentEditingDay].push(newTask);
                openEditModal(scheduleData.days[currentEditingDay].length - 1, false);
            }
        }

        function deleteTask() {
            if (confirm("¿Seguro que deseas eliminar esta actividad?")) {
                if (isDailyTask) {
                    scheduleData.daily.splice(editingIndex, 1);
                } else {
                    scheduleData.days[currentEditingDay].splice(editingIndex, 1);
                }
                saveToStorage();
                closeModal();
                renderDay(currentEditingDay);
                updateLiveActivity();
                updateCalculatedStats();
            }
        }

        function closeModal() { document.getElementById('edit-modal').classList.remove('active'); }

        function editWisdom() {
            const item = wisdomData[currentWisdomIndex];
            document.getElementById('edit-wisdom-quote').value = item.quote;
            document.getElementById('edit-wisdom-cite').value = item.cite;
            document.getElementById('edit-wisdom-video').value = item.video || "";
            document.getElementById('edit-wisdom-refl').value = item.reflection;
            document.getElementById('wisdom-modal').classList.add('active');
        }

        function saveWisdom() {
            const updated = {
                quote: document.getElementById('edit-wisdom-quote').value,
                cite: document.getElementById('edit-wisdom-cite').value,
                video: document.getElementById('edit-wisdom-video').value,
                reflection: document.getElementById('edit-wisdom-refl').value
            };
            wisdomData[currentWisdomIndex] = updated;
            saveToStorage();
            updateWisdomUI();
            closeWisdomModal();
        }

        function addNewWisdom() {
            const newItem = { quote: "Nueva frase", cite: "— Fuente", video: "", reflection: "👉 Reflexión" };
            wisdomData.push(newItem);
            currentWisdomIndex = wisdomData.length - 1;
            editWisdom();
        }

        let wisdomTimer;

        function nextWisdom() {
            currentWisdomIndex = (currentWisdomIndex + 1) % wisdomData.length;
            updateWisdomUI();
            resetWisdomTimer();
        }

        function prevWisdom() {
            currentWisdomIndex = (currentWisdomIndex - 1 + wisdomData.length) % wisdomData.length;
            updateWisdomUI();
            resetWisdomTimer();
        }

        function resetWisdomTimer() {
            clearInterval(wisdomTimer);
            wisdomTimer = setInterval(nextWisdom, 60000); // Cambio cada 60 segundos
        }

        function openLSCVideo() {
            const item = wisdomData[currentWisdomIndex];
            if (!item.video) return;
            
            if (item.video.includes('jw.org')) {
                // Direct open in new tab, no modal
                window.open(item.video, '_blank');
            } else {
                const iframe = document.getElementById('modal-video-iframe');
                if (iframe) {
                    iframe.classList.remove('hidden');
                    iframe.src = item.video;
                    document.getElementById('modal-video-cite').textContent = item.cite;
                    document.getElementById('video-modal').classList.add('active');
                }
            }
        }

        function navigateVideo(dir) {
            currentWisdomIndex = (currentWisdomIndex + dir + wisdomData.length) % wisdomData.length;
            const item = wisdomData[currentWisdomIndex];
            
            const iframe = document.getElementById('modal-video-iframe');
            if (iframe && item.video) {
                iframe.src = item.video;
                document.getElementById('modal-video-cite').textContent = item.cite;
                updateWisdomUI();
            } else if (!item.video) {
                navigateVideo(dir);
            }
        }

        function closeVideoModal() {
            const iframe = document.getElementById('modal-video-iframe');
            if (iframe) {
                iframe.src = "";
            }
            document.getElementById('video-modal').classList.remove('active');
        }

        function updateWisdomUI() {
            const item = wisdomData[currentWisdomIndex];
            document.getElementById('wisdom-quote').textContent = item.quote;
            document.getElementById('wisdom-cite').textContent = item.cite;
            document.getElementById('wisdom-reflection').textContent = item.reflection;
            document.getElementById('wisdom-counter').textContent = `${currentWisdomIndex + 1} / ${wisdomData.length}`;
            
            const actionBtn = document.getElementById('wisdom-video-action');
            if (actionBtn) {
                actionBtn.classList.toggle('hidden', !item.video);
            }
        }

        function closeWisdomModal() { document.getElementById('wisdom-modal').classList.remove('active'); }

        let currentViewDate = new Date();

        function renderCalendar() {
            const grid = document.getElementById('calendar-grid');
            const monthEl = document.getElementById('calendar-month');
            if (!grid || !monthEl) return;

            grid.innerHTML = '';
            const year = currentViewDate.getFullYear();
            const month = currentViewDate.getMonth();
            
            const monthNames = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
            monthEl.textContent = `${monthNames[month]} ${year}`;

            ["L", "M", "X", "J", "V", "S", "D"].forEach((d, idx) => {
                const dayHeader = document.createElement('div');
                dayHeader.className = `text-slate-500 font-bold py-1 ${idx >= 5 ? 'text-amber-500/50' : ''}`;
                dayHeader.innerHTML = d;
                grid.appendChild(dayHeader);
            });

            const firstDay = new Date(year, month, 1).getDay();
            const startingDay = (firstDay === 0) ? 6 : firstDay - 1;
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            for (let i = 0; i < startingDay; i++) grid.appendChild(document.createElement('div'));

            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dayOfWeek = date.getDay();
                const dayEl = document.createElement('div');
                dayEl.className = 'py-2 rounded border border-white/5 hover:bg-white/5 transition-all relative';
                dayEl.textContent = day;

                // Today
                const now = new Date();
                if (day === now.getDate() && month === now.getMonth() && year === now.getFullYear()) {
                    dayEl.classList.add('bg-blue-500/20', 'border-blue-500/50', 'text-white', 'font-bold');
                }

                // Exercise Days (Mon, Wed, Fri)
                if ([1, 3, 5].includes(dayOfWeek)) {
                    const dot = document.createElement('div');
                    dot.className = 'absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]';
                    dayEl.appendChild(dot);
                }

                // Sunday Rotation
                if (dayOfWeek === 0) {
                    const weekNum = getWeekNumber(date);
                    const cycle = ((weekNum - 1) % 2) + 1;
                    dayEl.classList.add(cycle === 1 ? 'border-emerald-500/30' : 'border-blue-500/30');
                    const icon = document.createElement('i');
                    icon.className = `absolute top-1 right-1 text-[8px] ${cycle === 1 ? 'fa-solid fa-futbol text-emerald-500' : 'fa-solid fa-water text-blue-500'}`;
                    dayEl.appendChild(icon);
                }

                grid.appendChild(dayEl);
            }
        }

        function changeMonth(dir) {
            currentViewDate.setMonth(currentViewDate.getMonth() + dir);
            renderCalendar();
        }

        function updateClock() {
            const now = new Date();
            let h = now.getHours();
            const m = String(now.getMinutes()).padStart(2, '0');
            const s = String(now.getSeconds()).padStart(2, '0');
            const ampm = h >= 12 ? 'p.m.' : 'a.m.';
            h = h % 12 || 12;
            const timeStr = `${h}:${m}:${s} ${ampm}`;
            document.getElementById('live-clock').textContent = timeStr;
            
            // Saludo dinámico
            let greeting = "Buenos días";
            const hour = now.getHours();
            if (hour >= 12 && hour < 19) {
                greeting = "Buenas tardes";
            } else if (hour >= 19 || hour < 5) {
                greeting = "Buenas noches";
            }
            
            const greetingEl = document.getElementById('dynamic-greeting');
            if (greetingEl) {
                greetingEl.innerHTML = `${greeting}, ${globalUserName} <i class="fa-solid fa-pen text-[10px] opacity-0 group-hover/greet:opacity-100 transition-opacity ml-2"></i>`;
            }

            updateLiveActivity();
        }

        function getWeekNumber(d) {
            d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
            d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
            return Math.ceil((((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
        }

        function updateSundayStatus() {
            const cycle = ((getWeekNumber(new Date()) - 1) % 2) + 1;
            ['sun-week-1', 'sun-week-2'].forEach((id, i) => {
                const el = document.getElementById(id);
                if (el) el.className = `p-3 rounded-lg border border-white/5 bg-white/5 text-center transition-all ${cycle === i+1 ? 'ring-2 ring-emerald-500 bg-emerald-500/10' : ''}`;
            });
            const nextSunEl = document.getElementById('next-sunday-text');
            if (nextSunEl) nextSunEl.textContent = cycle === 1 ? "⚽ Fútbol / Ejercicio" : "🌊 Naturaleza (Playa/Río)";
        }

        function updateLiveActivity() {
            const now = new Date();
            const currentTime = now.toTimeString().slice(0, 5);
            const tasks = [...scheduleData.daily, ...(scheduleData.days[now.getDay()] || [])];
            
            function isNow(start, end, target) {
                if (start <= end) return target >= start && target < end;
                return target >= start || target < end; 
            }

            let current = tasks.find(t => isNow(t.start, t.end, currentTime));

            if (current) {
                const identifier = `${current.task}-${current.start}`;
                if (lastActiveTaskIdentifier !== null && lastActiveTaskIdentifier !== identifier) {
                    triggerAlarmModal(current);
                }
                lastActiveTaskIdentifier = identifier;
            } else {
                lastActiveTaskIdentifier = null;
            }

            const display = document.getElementById('current-activity-display');
            if (display) {
                if (current) {
                    const [sh, sm] = current.start.split(':').map(Number);
                    const [eh, em] = current.end.split(':').map(Number);
                    const startTotal = sh * 60 + sm;
                    let endTotal = eh * 60 + em;
                    if (endTotal < startTotal) endTotal += 24 * 60;
                    
                    const nowTotal = now.getHours() * 60 + now.getMinutes();
                    const currentTotal = (nowTotal < startTotal && endTotal > 1440) ? nowTotal + 1440 : nowTotal;
                    
                    const totalDuration = endTotal - startTotal;
                    const elapsed = currentTotal - startTotal;
                    const pct = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
                    
                    const remMins = endTotal - currentTotal;
                    const remH = Math.floor(remMins / 60);
                    const remM = remMins % 60;
                    const remS = 59 - now.getSeconds();

                    display.innerHTML = `
                        <div class="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl relative overflow-hidden group">
                            <div class="absolute top-0 left-0 h-1 bg-blue-500/20 w-full">
                                <div class="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6] transition-all duration-1000" style="width: ${pct}%"></div>
                            </div>
                            <div class="flex items-center justify-between mb-4 mt-2">
                                <div class="flex items-center gap-3">
                                    <span class="text-3xl animate-pulse text-blue-400">${current.icon.includes('fa-') ? `<i class="${current.icon}"></i>` : current.icon}</span>
                                    <div>
                                        <h3 class="font-black text-lg text-white uppercase leading-none">${current.task}</h3>
                                        <p class="text-[8px] mono text-blue-400 uppercase tracking-widest mt-1">Sincronizado en tiempo real</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <span class="text-xs font-bold text-white mono">${Math.round(pct)}%</span>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-2 mb-3">
                                <div class="bg-black/40 rounded-lg p-2 border border-white/5">
                                    <p class="text-[7px] mono text-slate-500 uppercase">Restante</p>
                                    <p class="text-sm font-bold text-white mono">${remH > 0 ? remH + 'h ' : ''}${remM}m <span class="text-[10px] text-blue-500">${remS}s</span></p>
                                </div>
                                <div class="bg-black/40 rounded-lg p-2 border border-white/5">
                                    <p class="text-[7px] mono text-slate-500 uppercase">Finaliza</p>
                                    <p class="text-sm font-bold text-slate-300 mono">${format12h(current.end)}</p>
                                </div>
                            </div>

                            <p class="text-[10px] text-slate-400 italic px-1">"${current.desc || ''}"</p>
                        </div>`;
                } else {
                    display.innerHTML = '<div class="p-8 text-center border border-dashed border-white/10 rounded-xl"><p class="text-[10px] mono text-slate-600 uppercase">Standby Mode</p><p class="text-xs text-slate-500 italic mt-1">Sin actividades en este bloque</p></div>';
                }
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('sw.js').then(reg => {
                    swRegistration = reg;
                }).catch(err => console.error('SW Error:', err));
            }
            
            renderDay(new Date().getDay());
            updateWisdomUI();
            updateSundayStatus();
            renderCalendar();
            resetWisdomTimer();
            updateNotifyButton();
            setInterval(updateClock, 1000);
            updateLiveActivity();
            updateCalculatedStats();
            setTimeout(() => document.querySelectorAll('.reveal').forEach(el => el.classList.add('active')), 100);
        });
