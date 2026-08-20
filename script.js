// Logic replicating time.py

function parseTimeDecimal(timeStr) {
    const timeFloat = parseFloat(timeStr);
    if (isNaN(timeFloat)) return 0;

    const hours = Math.floor(timeFloat);
    // Handle floating point precision issues
    const minutesDecimal = timeFloat - hours;
    const minutes = Math.round(minutesDecimal * 100);

    return hours * 60 + minutes; // Return total minutes
}

function formatMinutesToHM(totalMinutes) {
    const isNegative = totalMinutes < 0;
    const absMinutes = Math.abs(totalMinutes);
    const hours = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;
    return `${isNegative ? '-' : ''}${hours}h ${minutes}m`;
}

function formatTime(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${strMinutes} ${ampm}`;
}

// UI Interaction
const timesheetInputsContainer = document.getElementById('timesheet-inputs');
const addBtn = document.getElementById('add-btn');
const calcBtn = document.getElementById('calc-btn');
const resultSection = document.getElementById('result-section');
const totalWorkedEl = document.getElementById('total-worked');
const remainingTimeEl = document.getElementById('remaining-time');
const remainingLabelEl = document.getElementById('remaining-label');
const leavingTimeEl = document.getElementById('leaving-time');

let inputIdCounter = 0;
let workChart = null;

function createInputGroup() {
    inputIdCounter++;
    const div = document.createElement('div');
    div.className = 'input-group';
    div.id = `input-group-${inputIdCounter}`;
    div.innerHTML = `
        <div class="input-wrapper">
            <label>Timesheet (HH.MM)</label>
            <div class="time-input-container">
                <input type="number" step="0.01" placeholder="e.g. 5.32" class="time-input">
                <button class="delete-btn" onclick="deleteInput(${inputIdCounter})" aria-label="Delete timesheet">
                    <i class="fa fa-trash-o" style="font-size: 18px;"></i>
                </button>
            </div>
        </div>
    `;
    timesheetInputsContainer.appendChild(div);

    // Focus the new input
    const input = div.querySelector('.time-input');
    if (input) {
        input.focus();
    }
}

// Initial input
createInputGroup();

addBtn.addEventListener('click', createInputGroup);

window.deleteInput = function (id) {
    const element = document.getElementById(`input-group-${id}`);
    if (element) {
        // Find previous input to focus
        const allGroups = Array.from(timesheetInputsContainer.children);
        const index = allGroups.indexOf(element);

        if (index > 0) {
            const previousGroup = allGroups[index - 1];
            const previousInput = previousGroup.querySelector('.time-input');
            if (previousInput) {
                previousInput.focus();
            }
        }

        element.remove();
    }
}

function updateChart(workedMinutes, remainingMinutes) {
    const ctx = document.getElementById('workChart').getContext('2d');

    // Green for worked, Red for remaining
    const chartData = remainingMinutes < 0
        ? [workedMinutes, 0]
        : [workedMinutes, remainingMinutes];

    const chartColors = remainingMinutes < 0
        ? ['#00b894', '#2d3436'] // Overtime color
        : ['#00b894', '#ff7675']; // Green (Worked), Red (Remaining)

    if (workChart) {
        workChart.data.datasets[0].data = chartData;
        workChart.data.datasets[0].backgroundColor = chartColors;
        workChart.update();
    } else {
        workChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Worked', 'Remaining'],
                datasets: [{
                    data: chartData,
                    backgroundColor: chartColors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#b2bec3',
                            font: {
                                family: "'Outfit', sans-serif",
                                size: 11
                            },
                            boxWidth: 10
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const value = context.raw;
                                return formatMinutesToHM(value);
                            }
                        }
                    }
                },
                cutout: '75%'
            }
        });
    }
}

// Global variable to control jail animation
let currentJailOpenPercentage = 0; // Current state for animation
let targetJailOpenPercentage = 0; // Target state based on calculation

const clearBtn = document.getElementById('clear-btn');

clearBtn.addEventListener('click', () => {
    // Clear inputs
    timesheetInputsContainer.innerHTML = '';
    inputIdCounter = 0;
    createInputGroup(); // Add one empty input

    // Reset results
    totalWorkedEl.textContent = '0H';
    remainingTimeEl.textContent = '0H';
    leavingTimeEl.textContent = '--:--';
    resultSection.classList.add('hidden');
    resultSection.style.display = 'none';

    // Reset Chart
    if (workChart) {
        workChart.destroy();
        workChart = null;
    }

    // Reset Animation Target
    targetJailOpenPercentage = 0;
});

calcBtn.addEventListener('click', () => {
    const inputs = document.querySelectorAll('.time-input');
    let totalMinutesWorked = 0;

    inputs.forEach(input => {
        if (input.value) {
            totalMinutesWorked += parseTimeDecimal(input.value);
        }
    });
// =======================================================================================
// =======================================================================================
// =======================================================================================
// =======================================================================================
    const targetMinutes = 8 * 60 + 30; // 8 hours 15 minutes = 495 minutes
    const remainingMinutes = targetMinutes - totalMinutesWorked;

    // Calculate jail open percentage
    if (remainingMinutes <= 0) {
        targetJailOpenPercentage = 1; // Fully open
    } else {
        targetJailOpenPercentage = 1 - (remainingMinutes / targetMinutes);
        if (targetJailOpenPercentage < 0) targetJailOpenPercentage = 0;
    }

    const now = new Date();
    const leavingTime = new Date(now.getTime() + remainingMinutes * 60000);

    totalWorkedEl.textContent = formatMinutesToHM(totalMinutesWorked);

    if (remainingMinutes > 0) {
        remainingLabelEl.textContent = "Remaining";
        remainingTimeEl.textContent = formatMinutesToHM(remainingMinutes);
    } else {
        remainingLabelEl.textContent = "Overtime";
        remainingTimeEl.textContent = formatMinutesToHM(-remainingMinutes);
    }

    leavingTimeEl.textContent = formatTime(leavingTime);

    resultSection.classList.remove('hidden');
    resultSection.style.display = 'flex';

    updateChart(totalMinutesWorked, remainingMinutes);
});

// Keyboard Shortcuts
document.addEventListener('keydown', (event) => {
    // Enter key -> Calculate
    if (event.key === 'Enter') {
        calcBtn.click();
    }

    // Plus key (+) -> Add Timesheet
    // Check for both NumpadAdd and standard Plus (Shift+=)
    if (event.key === '+' || event.code === 'NumpadAdd') {
        // Prevent default if focused on an input to avoid typing '+'
        if (document.activeElement.tagName !== 'INPUT') {
            addBtn.click();
        } else {
            // If inside input, we might want to allow typing +, but user asked for shortcut
            // "when i press plus(+) key then add a new time sheet"
            // Usually shortcuts shouldn't interfere with typing, but for number inputs + isn't valid usually unless scientific notation?
            // Let's assume global shortcut for now, but maybe prevent default to avoid typing it
            event.preventDefault();
            addBtn.click();
        }
    }

    // Delete key -> Delete Active Timesheet
    if (event.key === 'Delete') {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.classList.contains('time-input')) {
            // No need to prevent default for Delete usually, but we want to trigger our custom delete
            // However, if the input has text, Delete usually deletes character. 
            // The user said "use delete key instead of minus key for delete button".
            // If I just press delete, it might delete the character. 
            // If the input is empty? Or always?
            // Usually "Delete" key on a row implies deleting the row.
            // Let's assume if the user presses Delete, they want to delete the row, 
            // OR maybe only if the input is empty? 
            // The request says "use delete key ... for delete button". 
            // The delete button deletes the whole row.
            // So I will execute the row deletion. 
            // I should probably prevent default to stop it from deleting text if that's the intent, 
            // but if they want to edit text? 
            // "Delete" key is dangerous for editing. 
            // But the user specifically asked for it. 
            // "in key binding use delete key instead of minus(-) key for delete button"
            // I will implement it as requested.

            const inputGroup = activeElement.closest('.input-group');
            if (inputGroup) {
                const deleteBtn = inputGroup.querySelector('.delete-btn');
                if (deleteBtn) {
                    deleteBtn.click();
                }
            }
        }
    }
});


// Three.js Background Animation - Digital Time Prison
const initThreeJS = () => {
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Create a complex wireframe structure (Digital Prison)
    const geometry = new THREE.IcosahedronGeometry(7.5, 2);
    const wireframe = new THREE.WireframeGeometry(geometry);

    // Create line segments from wireframe
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x6c5ce7,
        transparent: true,
        opacity: 0.3,
        linewidth: 1
    });

    const prison = new THREE.LineSegments(wireframe, lineMaterial);
    scene.add(prison);

    // Inner core (The "Time" being trapped)
    const coreGeo = new THREE.OctahedronGeometry(2, 0);
    const coreMat = new THREE.MeshBasicMaterial({
        color: 0x00cec9,
        wireframe: true,
        transparent: true,
        opacity: 0.5
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    // Floating Particles
    const particlesGeo = new THREE.BufferGeometry();
    const particlesCount = 200;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 20;
    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({
        size: 0.03,
        color: 0xffffff,
        transparent: true,
        opacity: 0.2
    });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    camera.position.z = 10;

    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
    });

    const animate = () => {
        requestAnimationFrame(animate);

        // Smoothly interpolate current value towards target
        // Lerp factor 0.02 gives a slower, smoother transition
        currentJailOpenPercentage += (targetJailOpenPercentage - currentJailOpenPercentage) * 0.02;

        // Animation logic based on currentJailOpenPercentage
        // 0% open = Solid, fast rotation, high opacity
        // 100% open = Expanded, slow rotation, low opacity (Dissolved)

        const openness = currentJailOpenPercentage;

        // Expansion effect
        const scale = 1 + openness * 2; // Expands up to 3x
        prison.scale.set(scale, scale, scale);

        // Rotation speed decreases as it opens
        // Reduced base speed from 0.005 to 0.002 for slower animation
        const rotationSpeed = 0.002 * (1 - openness * 0.8);
        prison.rotation.x += rotationSpeed;
        prison.rotation.y += rotationSpeed;

        // Core rotation
        core.rotation.x -= rotationSpeed * 2;
        core.rotation.y -= rotationSpeed * 2;

        // Opacity fades as it opens
        lineMaterial.opacity = 0.3 * (1 - openness);
        coreMat.opacity = 0.5 * (1 - openness);

        // Color shift: Purple (Trapped) -> Green (Free)
        const r = 108 / 255 * (1 - openness); // 6c
        const g = 92 / 255 * (1 - openness) + 184 / 255 * openness; // 5c -> b8
        const b = 231 / 255 * (1 - openness) + 148 / 255 * openness; // e7 -> 94

        prison.material.color.setRGB(r, g, b);

        // Interactive movement
        prison.rotation.y += mouseX * 0.05;
        prison.rotation.x += mouseY * 0.05;

        particles.rotation.y += 0.001;

        renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
};

initThreeJS();
