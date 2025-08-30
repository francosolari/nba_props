# UI Components

This directory contains reusable UI primitives that can be used throughout the application. These components are designed to minimize duplication between collapsed and expanded views.

## Available Components

### Avatar

Displays a user avatar with an image if provided, or falls back to initials.

```jsx
import { Avatar } from './components/ui';

<Avatar 
  name="John Doe"
  src="/path/to/avatar.jpg" // Optional
  size="md" // 'xs', 'sm', 'md', 'lg', 'xl'
  bgColor="bg-gray-200" // Tailwind background color class
  textColor="text-gray-700" // Tailwind text color class
/>
```

### ProgressBar

Displays a progress bar with customizable appearance.

```jsx
import { ProgressBar } from './components/ui';

<ProgressBar 
  value={75} // Current value
  max={100} // Maximum value
  size="sm" // 'sm', 'lg'
  color="bg-blue-500" // Tailwind color class for the filled portion
  bgColor="bg-gray-200" // Tailwind color class for the background
  showValue={true} // Whether to display the value
  valueFormat="percent" // 'percent', 'fraction', or 'raw'
/>
```

### CategoryIcon

Maps category types to their corresponding icons/visual representations.

```jsx
import { CategoryIcon } from './components/ui';

<CategoryIcon 
  category="Regular" // 'Regular', 'Awards', or 'Props'
  size="md" // 'sm', 'md', 'lg'
  showLabel={false} // Whether to display the category label
/>
```

### PredictionRow

Displays a prediction with question text, status, and points earned.

```jsx
import { PredictionRow } from './components/ui';

<PredictionRow 
  question="Which team will win the NBA championship?"
  status="pending" // 'pending', 'correct', 'incorrect', 'partial'
  points={0} // Points earned
  possiblePoints={3} // Maximum possible points
  category="Regular" // 'Regular', 'Awards', 'Props'
  compact={false} // Whether to show in compact mode
  answer="Boston Celtics" // User's answer
  correctAnswer="" // The correct answer (if available)
/>
```

## Demo

To see all components in action, you can use the `UIComponentsDemo` component:

```jsx
import UIComponentsDemo from './components/UIComponentsDemo';

<UIComponentsDemo />
```
