// Force progress bar updates using vanilla JavaScript DOM manipulation
// This completely bypasses React's reconciliation system

export function forceProgressBarUpdate(petId: number, stats: any) {
  console.log('FORCE UPDATE CALLED:', petId, stats);
  
  const statsToUpdate = ['hunger', 'happiness', 'cleanliness', 'energy'];
  
  statsToUpdate.forEach(statType => {
    const value = stats[statType];
    if (value !== undefined) {
      console.log(`Updating ${statType} to ${value}% for pet ${petId}`);
      
      // Find and completely replace progress bar
      const container = document.querySelector(`[data-stat="${statType}-${petId}"]`)?.closest('.space-y-2');
      if (container) {
        createNewProgressBar(container as HTMLElement, statType, value, petId);
      }
    }
  });
}

function createNewProgressBar(container: HTMLElement, statType: string, value: number, petId: number) {
  const color = getColorForValue(value);
  const icon = getIconForStat(statType);
  
  // Create completely new HTML structure
  const newHTML = `
    <div class="space-y-2 progress-bar-force-update" data-timestamp="${Date.now()}">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-lg">${icon}</span>
          <span class="text-sm font-medium">${capitalize(statType)}</span>
        </div>
        <span class="text-lg font-bold" style="color: ${color};">
          ${value}%
        </span>
      </div>
      <div class="relative h-6 bg-gray-200 rounded-full overflow-hidden">
        <div 
          class="h-full rounded-full transition-all duration-500"
          style="
            background-color: ${color};
            width: ${value}%;
            animation: forceUpdate 0.4s ease-in-out;
          "
          data-stat="${statType}-${petId}"
        ></div>
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span class="text-xs font-bold text-white drop-shadow-lg">
            ${icon} ${value}/100
          </span>
        </div>
      </div>
    </div>
  `;
  
  // Replace entire container content
  container.innerHTML = newHTML;
  
  // Force reflow
  container.offsetHeight;
  
  console.log(`Successfully updated ${statType} progress bar to ${value}%`);
}

function getIconForStat(statType: string): string {
  const icons = {
    hunger: '🍖',
    happiness: '😊',
    cleanliness: '🛁',
    energy: '⚡'
  };
  return icons[statType as keyof typeof icons] || '📊';
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getColorForValue(value: number): string {
  if (value >= 75) return '#10b981'; // green-500
  if (value >= 50) return '#8b5cf6'; // purple-500
  if (value >= 25) return '#3b82f6'; // blue-500
  return '#ef4444'; // red-500
}

// Force complete page refresh of progress bars
export function refreshAllProgressBars() {
  console.log('Refreshing all progress bars');
  const allProgressBars = document.querySelectorAll('[data-stat]') as NodeListOf<HTMLElement>;
  
  allProgressBars.forEach(bar => {
    bar.style.transform = 'translateZ(0)';
    bar.offsetHeight;
    bar.style.transform = '';
    bar.classList.add('progress-bar-force-update');
    setTimeout(() => bar.classList.remove('progress-bar-force-update'), 400);
  });
}