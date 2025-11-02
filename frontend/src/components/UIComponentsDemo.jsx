// src/components/UIComponentsDemo.jsx
import React from 'react';
import { Avatar, ProgressBar, CategoryIcon, PredictionRow } from './ui';

/**
 * UIComponentsDemo
 * 
 * Demonstrates all the reusable UI primitives.
 * This component is for demonstration purposes only.
 */
const UIComponentsDemo = () => {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">UI Components Demo</h1>
      
      {/* Avatar Component Demo */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Avatar Component</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex flex-col items-center">
            <Avatar 
              name="John Doe" 
              size="xs"
            />
            <span className="mt-2 text-sm">Size: xs</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar 
              name="Jane Smith" 
              size="sm"
              bgColor="bg-blue-200"
              textColor="text-blue-700"
            />
            <span className="mt-2 text-sm">Size: sm</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar 
              name="Alice Johnson" 
              size="md"
              bgColor="bg-green-200"
              textColor="text-green-700"
            />
            <span className="mt-2 text-sm">Size: md (default)</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar 
              name="Bob Williams" 
              size="lg"
              bgColor="bg-purple-200"
              textColor="text-purple-700"
            />
            <span className="mt-2 text-sm">Size: lg</span>
          </div>
          <div className="flex flex-col items-center">
            <Avatar 
              name="Charlie Brown" 
              size="xl"
              bgColor="bg-red-200"
              textColor="text-red-700"
            />
            <span className="mt-2 text-sm">Size: xl</span>
          </div>
        </div>
      </section>
      
      {/* ProgressBar Component Demo */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">ProgressBar Component</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg mb-2">Small (default)</h3>
            <ProgressBar value={30} max={100} />
          </div>
          <div>
            <h3 className="text-lg mb-2">Large with custom color</h3>
            <ProgressBar 
              value={65} 
              max={100} 
              size="lg" 
              color="bg-purple-500" 
              showValue={true} 
            />
          </div>
          <div>
            <h3 className="text-lg mb-2">Points (fraction format)</h3>
            <ProgressBar 
              value={2} 
              max={3} 
              size="lg" 
              color="bg-green-500" 
              showValue={true} 
              valueFormat="fraction" 
            />
          </div>
        </div>
      </section>
      
      {/* CategoryIcon Component Demo */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">CategoryIcon Component</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border p-4 rounded-md">
            <h3 className="mb-3 font-medium">Regular Category</h3>
            <div className="flex flex-col space-y-3">
              <CategoryIcon category="Regular" size="sm" />
              <CategoryIcon category="Regular" size="md" />
              <CategoryIcon category="Regular" size="lg" />
              <CategoryIcon category="Regular" size="md" showLabel={true} />
            </div>
          </div>
          <div className="border p-4 rounded-md">
            <h3 className="mb-3 font-medium">Awards Category</h3>
            <div className="flex flex-col space-y-3">
              <CategoryIcon category="Awards" size="sm" />
              <CategoryIcon category="Awards" size="md" />
              <CategoryIcon category="Awards" size="lg" />
              <CategoryIcon category="Awards" size="md" showLabel={true} />
            </div>
          </div>
          <div className="border p-4 rounded-md">
            <h3 className="mb-3 font-medium">Props Category</h3>
            <div className="flex flex-col space-y-3">
              <CategoryIcon category="Props" size="sm" />
              <CategoryIcon category="Props" size="md" />
              <CategoryIcon category="Props" size="lg" />
              <CategoryIcon category="Props" size="md" showLabel={true} />
            </div>
          </div>
        </div>
      </section>
      
      {/* PredictionRow Component Demo */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">PredictionRow Component</h2>
        <div className="space-y-4">
          <PredictionRow 
            question="Which team will win the NBA championship?" 
            status="pending"
            points={0}
            category="Regular"
            answer="Boston Celtics"
          />
          <PredictionRow 
            question="Who will win MVP?" 
            status="correct"
            points={3}
            category="Awards"
            answer="Nikola Jokić"
            correctAnswer="Nikola Jokić"
          />
          <PredictionRow 
            question="Will LeBron James average over 25 points per game?" 
            status="incorrect"
            points={0}
            category="Props"
            answer="Yes"
            correctAnswer="No"
          />
          <PredictionRow 
            question="Will the Lakers make the playoffs?" 
            status="partial"
            points={1}
            category="Regular"
            answer="Yes, as 6th seed"
            correctAnswer="Yes, but through play-in"
          />
          <h3 className="text-lg mt-6 mb-2">Compact Mode</h3>
          <div className="space-y-2">
            <PredictionRow 
              question="Which team will have the best regular season record?" 
              status="pending"
              points={0}
              category="Regular"
              compact={true}
            />
            <PredictionRow 
              question="Who will win Rookie of the Year?" 
              status="correct"
              points={3}
              category="Awards"
              compact={true}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default UIComponentsDemo;
