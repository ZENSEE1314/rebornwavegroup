// Force progress bar updates using vanilla JavaScript DOM manipulation
// This bypasses React's reconciliation system entirely

export function forceProgressBarUpdate(petId: number, stats: any) {
  // Wait for DOM to be ready
  setTimeout(() => {
    const statsToUpdate = ['hunger', 'happiness', 'cleanliness', 'energy'];
    
    statsToUpdate.forEach(statType => {
      const value = stats[statType];
      if (value !== undefined) {
        updateProgressBar(petId, statType, value);
        updateValueDisplay(petId, statType, value);
      }
    });
  }, 50);
}

function updateProgressBar(petId: number, statType: string, value: number) {
  // Find progress bar by data attribute
  const progressBar = document.querySelector(`[data-stat="${statType}-${petId}"]`) as HTMLElement;
  
  if (progressBar) {
    // Force immediate visual update
    progressBar.style.width = '0%';
    progressBar.style.transition = 'none';
    
    // Force browser reflow
    progressBar.offsetHeight;
    
    // Apply new value with animation
    progressBar.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    progressBar.style.width = `${value}%`;
    
    // Update color based on value
    const color = getColorForValue(value);
    progressBar.style.backgroundColor = color;
    
    // Add pulse animation for visual feedback
    progressBar.style.animation = 'pulse 0.5s ease-in-out';
    
    // Force another reflow
    progressBar.offsetHeight;
    
    // Remove animation after completion
    setTimeout(() => {
      progressBar.style.animation = '';
    }, 500);
  }
}

function updateValueDisplay(petId: number, statType: string, value: number) {
  // Update percentage text displays
  document.querySelectorAll('span, div').forEach(element => {
    if (element.textContent?.includes('%')) {
      // Check if this element is related to our pet and stat
      const parentContainer = element.closest(`[data-stat*="${petId}"]`);
      if (parentContainer || element.textContent.includes(statType)) {
        // Update the percentage value
        element.textContent = element.textContent.replace(/\d+%/, `${value}%`);
        element.textContent = element.textContent.replace(/\d+\/100/, `${value}/100`);
      }
    }
  });
}

function getColorForValue(value: number): string {
  if (value >= 75) return '#10b981'; // green-500
  if (value >= 50) return '#8b5cf6'; // purple-500
  if (value >= 25) return '#3b82f6'; // blue-500
  return '#ef4444'; // red-500
}

// Force complete page refresh of progress bars
export function refreshAllProgressBars() {
  const allProgressBars = document.querySelectorAll('[data-stat]') as NodeListOf<HTMLElement>;
  
  allProgressBars.forEach(bar => {
    // Force repaint by changing a style property
    bar.style.transform = 'translateZ(0)';
    bar.offsetHeight; // Force reflow
    bar.style.transform = '';
  });
}