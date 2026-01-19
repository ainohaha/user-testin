import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Slider } from './ui/slider';
import { Checkbox } from './ui/checkbox';
import { CheckCircle2, Mail } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ClosingProps {
  responses: Record<string, any>;
  onNext: (data: Record<string, any>) => void;
}

export function Closing({ responses, onNext }: ClosingProps) {
  const [currentPart, setCurrentPart] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  // Part 3 - Quant Survey
  const [valueAccuracy, setValueAccuracy] = useState([3]);
  const [trustEmployees, setTrustEmployees] = useState([3]);
  const [bulkScanner, setBulkScanner] = useState([3]);
  const [bundleValue, setBundleValue] = useState([3]);
  const [rewardsWorthwhile, setRewardsWorthwhile] = useState([3]);
  const [topFeatures, setTopFeatures] = useState<string[]>([]);
  const [topConcerns, setTopConcerns] = useState<string[]>([]);

  // Part 4 - Qualitative Deep Dive
  const [mostExcited, setMostExcited] = useState('');
  const [concerns, setConcerns] = useState('');
  const [describeProVault, setDescribeProVault] = useState('');
  const [mostConfusing, setMostConfusing] = useState('');
  const [whatsMissing, setWhatsMissing] = useState('');
  const [whenToUse, setWhenToUse] = useState('');
  const [whatPrevents, setWhatPrevents] = useState('');
  const [magicWand, setMagicWand] = useState('');

  // Part 5 - Wrap-Up
  const [tellOthers, setTellOthers] = useState('');
  const [oneThing, setOneThing] = useState('');
  const [stopYou, setStopYou] = useState('');
  const [email, setEmail] = useState('');

  const handleFeatureToggle = (feature: string) => {
    if (topFeatures.includes(feature)) {
      setTopFeatures(topFeatures.filter(f => f !== feature));
    } else if (topFeatures.length < 3) {
      setTopFeatures([...topFeatures, feature]);
    }
  };

  const handleConcernToggle = (concern: string) => {
    if (topConcerns.includes(concern)) {
      setTopConcerns(topConcerns.filter(c => c !== concern));
    } else if (topConcerns.length < 2) {
      setTopConcerns([...topConcerns, concern]);
    }
  };

  const handlePart3Submit = () => {
    setCurrentPart(2);
    window.scrollTo(0, 0);
  };

  const handlePart4Submit = () => {
    setCurrentPart(3);
    window.scrollTo(0, 0);
  };

  const handleFinalSubmit = () => {
    const quantSurvey = {
      valueAccuracy: valueAccuracy[0],
      trustEmployees: trustEmployees[0],
      bulkScanner: bulkScanner[0],
      bundleValue: bundleValue[0],
      rewardsWorthwhile: rewardsWorthwhile[0],
      topFeatures,
      topConcerns
    };
    
    const qualitativeDeepDive = {
      mostExcited,
      concerns,
      describeProVault,
      mostConfusing,
      whatsMissing,
      whenToUse,
      whatPrevents,
      magicWand
    };
    
    const wrapUp = {
      tellOthers,
      oneThing,
      stopYou,
      email
    };
    
    const allClosingData = {
      quantSurvey,
      qualitativeDeepDive,
      wrapUp
    };
    
    onNext(allClosingData);
    setSubmitted(true);
  };

  const isPart3Complete = topFeatures.length === 3 && topConcerns.length === 2;
  const isPart4Complete = mostExcited && concerns && describeProVault && mostConfusing && whatsMissing && whenToUse && whatPrevents && magicWand;
  const isPart5Complete = tellOthers && oneThing && stopYou;

  useEffect(() => {
    if (submitted) {
      // Confetti from left side
      confetti({
        particleCount: 100,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 }
      });
      
      // Confetti from right side
      confetti({
        particleCount: 100,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 }
      });
    }
  }, [submitted]);

  if (submitted) {
    return (
      <div className="space-y-6 text-center py-12">
        <div className="flex justify-center">
          <div className="bg-green-100 rounded-full p-6">
            <CheckCircle2 className="w-16 h-16 text-green-600" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1>You did it!</h1>
          <p className="text-slate-600 max-w-md mx-auto">
            Thank you for your valuable feedback. Your responses have been recorded and will help us 
            improve the ProVault experience.
          </p>
        </div>

        <p className="text-sm text-slate-500">
          You may now close this window.
        </p>
      </div>
    );
  }

  // Part 3 - Quant Survey
  if (currentPart === 1) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1>Survey</h1>
          <p className="text-slate-400">
            Please rate your agreement with the following statements.
          </p>
        </div>

        <Card className="p-6 space-y-6">
          <div className="space-y-3">
            <h3>I believe the collection value shown is accurate. *</h3>
            <div className="space-y-2 px-2">
              <Slider
                value={valueAccuracy}
                onValueChange={setValueAccuracy}
                min={1}
                max={5}
                step={1}
              />
              <div className="flex justify-between items-center relative" style={{ paddingLeft: '0px', paddingRight: '0px' }}>
                {[1, 2, 3, 4, 5].map((num, index) => (
                  <div 
                    key={num} 
                    className="flex flex-col items-center"
                    style={{ 
                      position: 'absolute',
                      left: `${index * 25}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <span className={`text-sm ${valueAccuracy[0] === num ? 'text-primary' : 'text-slate-400'}`}>
                      {num}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-slate-500 pt-4">
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3>I trust GameStop employees to handle valuable cards.</h3>
            <div className="space-y-2 px-2">
              <Slider
                value={trustEmployees}
                onValueChange={setTrustEmployees}
                min={1}
                max={5}
                step={1}
              />
              <div className="flex justify-between items-center relative" style={{ paddingLeft: '0px', paddingRight: '0px' }}>
                {[1, 2, 3, 4, 5].map((num, index) => (
                  <div 
                    key={num} 
                    className="flex flex-col items-center"
                    style={{ 
                      position: 'absolute',
                      left: `${index * 25}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <span className={`text-sm ${trustEmployees[0] === num ? 'text-primary' : 'text-slate-400'}`}>
                      {num}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-slate-500 pt-4">
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3>The bulk scanner would save significant time.</h3>
            <div className="space-y-2 px-2">
              <Slider
                value={bulkScanner}
                onValueChange={setBulkScanner}
                min={1}
                max={5}
                step={1}
              />
              <div className="flex justify-between items-center relative" style={{ paddingLeft: '0px', paddingRight: '0px' }}>
                {[1, 2, 3, 4, 5].map((num, index) => (
                  <div 
                    key={num} 
                    className="flex flex-col items-center"
                    style={{ 
                      position: 'absolute',
                      left: `${index * 25}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <span className={`text-sm ${bulkScanner[0] === num ? 'text-primary' : 'text-slate-400'}`}>
                      {num}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-slate-500 pt-4">
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3>I understand how bundles increase sale value.</h3>
            <div className="space-y-2 px-2">
              <Slider
                value={bundleValue}
                onValueChange={setBundleValue}
                min={1}
                max={5}
                step={1}
              />
              <div className="flex justify-between items-center relative" style={{ paddingLeft: '0px', paddingRight: '0px' }}>
                {[1, 2, 3, 4, 5].map((num, index) => (
                  <div 
                    key={num} 
                    className="flex flex-col items-center"
                    style={{ 
                      position: 'absolute',
                      left: `${index * 25}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <span className={`text-sm ${bundleValue[0] === num ? 'text-primary' : 'text-slate-400'}`}>
                      {num}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-slate-500 pt-4">
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3>Rewards make selling worthwhile.</h3>
            <div className="space-y-2 px-2">
              <Slider
                value={rewardsWorthwhile}
                onValueChange={setRewardsWorthwhile}
                min={1}
                max={5}
                step={1}
              />
              <div className="flex justify-between items-center relative" style={{ paddingLeft: '0px', paddingRight: '0px' }}>
                {[1, 2, 3, 4, 5].map((num, index) => (
                  <div 
                    key={num} 
                    className="flex flex-col items-center"
                    style={{ 
                      position: 'absolute',
                      left: `${index * 25}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <span className={`text-sm ${rewardsWorthwhile[0] === num ? 'text-primary' : 'text-slate-400'}`}>
                      {num}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-slate-500 pt-4">
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="space-y-3">
            <h3>Top 3 Most Valuable Features</h3>
            <p className="text-sm text-slate-600">Select exactly 3 features</p>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="feature-bulk" 
                  checked={topFeatures.includes('Bulk scanning')}
                  onCheckedChange={() => handleFeatureToggle('Bulk scanning')}
                />
                <Label htmlFor="feature-bulk">Bulk scanning</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="feature-pricing" 
                  checked={topFeatures.includes('Auto pricing')}
                  onCheckedChange={() => handleFeatureToggle('Auto pricing')}
                />
                <Label htmlFor="feature-pricing">Auto pricing</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="feature-dropoff" 
                  checked={topFeatures.includes('In-store drop-off')}
                  onCheckedChange={() => handleFeatureToggle('In-store drop-off')}
                />
                <Label htmlFor="feature-dropoff">In-store drop-off</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="feature-tracking" 
                  checked={topFeatures.includes('Verification tracking')}
                  onCheckedChange={() => handleFeatureToggle('Verification tracking')}
                />
                <Label htmlFor="feature-tracking">Verification tracking</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="feature-filter" 
                  checked={topFeatures.includes('Message filter')}
                  onCheckedChange={() => handleFeatureToggle('Message filter')}
                />
                <Label htmlFor="feature-filter">Message filter</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="feature-rewards" 
                  checked={topFeatures.includes('Rewards')}
                  onCheckedChange={() => handleFeatureToggle('Rewards')}
                />
                <Label htmlFor="feature-rewards">Rewards</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="feature-ratings" 
                  checked={topFeatures.includes('Seller ratings')}
                  onCheckedChange={() => handleFeatureToggle('Seller ratings')}
                />
                <Label htmlFor="feature-ratings">Seller ratings</Label>
              </div>
            </div>
            {topFeatures.length > 0 && (
              <p className="text-sm text-primary">
                {topFeatures.length} of 3 selected
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="space-y-3">
            <h3>Top 2 Biggest Concerns</h3>
            <p className="text-sm text-slate-600">Select exactly 2 concerns</p>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="concern-lost" 
                  checked={topConcerns.includes('Lost/damaged cards')}
                  onCheckedChange={() => handleConcernToggle('Lost/damaged cards')}
                />
                <Label htmlFor="concern-lost">Lost/damaged cards</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="concern-pricing" 
                  checked={topConcerns.includes('Pricing accuracy')}
                  onCheckedChange={() => handleConcernToggle('Pricing accuracy')}
                />
                <Label htmlFor="concern-pricing">Pricing accuracy</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="concern-scams" 
                  checked={topConcerns.includes('Buyer scams')}
                  onCheckedChange={() => handleConcernToggle('Buyer scams')}
                />
                <Label htmlFor="concern-scams">Buyer scams</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="concern-commission" 
                  checked={topConcerns.includes('High commission')}
                  onCheckedChange={() => handleConcernToggle('High commission')}
                />
                <Label htmlFor="concern-commission">High commission</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="concern-undercutting" 
                  checked={topConcerns.includes('Seller undercutting')}
                  onCheckedChange={() => handleConcernToggle('Seller undercutting')}
                />
                <Label htmlFor="concern-undercutting">Seller undercutting</Label>
              </div>
            </div>
            {topConcerns.length > 0 && (
              <p className="text-sm text-primary">
                {topConcerns.length} of 2 selected
              </p>
            )}
          </div>
        </Card>

        <Button
          onClick={handlePart3Submit}
          disabled={!isPart3Complete}
          className="w-full"
          size="lg"
        >
          Continue to Feedback
        </Button>
      </div>
    );
  }

  // Part 2 - Deep Dive Questions
  if (currentPart === 2) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1>Deep Dive</h1>
          <p className="text-slate-400">
            Share your thoughts and experiences in detail.
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <div className="space-y-3">
            <Label htmlFor="excited">
              What part of ProVault are you most excited about? *
            </Label>
            <Textarea
              id="excited"
              placeholder="Type..."
              value={mostExcited}
              onChange={(e) => setMostExcited(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="concerns">
              What are your biggest concerns? *
            </Label>
            <Textarea
              id="concerns"
              placeholder="Type..."
              value={concerns}
              onChange={(e) => setConcerns(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="describe">
              How would you describe ProVault to a friend? *
            </Label>
            <Textarea
              id="describe"
              placeholder="Type..."
              value={describeProVault}
              onChange={(e) => setDescribeProVault(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="confusing">
              What was most confusing or unclear? *
            </Label>
            <Textarea
              id="confusing"
              placeholder="Type..."
              value={mostConfusing}
              onChange={(e) => setMostConfusing(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="missing">
              What's missing that you'd want to see? *
            </Label>
            <Textarea
              id="missing"
              placeholder="Type..."
              value={whatsMissing}
              onChange={(e) => setWhatsMissing(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="when">
              When would you use ProVault vs other platforms? *
            </Label>
            <Textarea
              id="when"
              placeholder="Type..."
              value={whenToUse}
              onChange={(e) => setWhenToUse(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="prevents">
              What would prevent you from using it regularly? *
            </Label>
            <Textarea
              id="prevents"
              placeholder="Type..."
              value={whatPrevents}
              onChange={(e) => setWhatPrevents(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="wand">
              If you had a magic wand, what would you change? *
            </Label>
            <Textarea
              id="wand"
              placeholder="Type..."
              value={magicWand}
              onChange={(e) => setMagicWand(e.target.value)}
              rows={3}
            />
          </div>
        </Card>

        <Button
          onClick={handlePart4Submit}
          disabled={!isPart4Complete}
          className="w-full"
          size="lg"
        >
          Continue to Feedback
        </Button>
      </div>
    );
  }

  // Part 3 - Feedback
  if (currentPart === 3) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1>Feedback</h1>
          <p className="text-slate-400">
            Share your thoughts and experiences in detail.
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <div className="space-y-3">
            <Label htmlFor="tell">
              What would you tell another collector about ProVault? *
            </Label>
            <Textarea
              id="tell"
              placeholder="Type..."
              value={tellOthers}
              onChange={(e) => setTellOthers(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="try">
              If it launched tomorrow, what's the one thing that would make you try it immediately? *
            </Label>
            <Textarea
              id="try"
              placeholder="Type..."
              value={oneThing}
              onChange={(e) => setOneThing(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="stop">
              What's the one thing that would stop you? *
            </Label>
            <Textarea
              id="stop"
              placeholder="Type..."
              value={stopYou}
              onChange={(e) => setStopYou(e.target.value)}
              rows={3}
            />
          </div>
        </Card>

        <Button
          onClick={() => {
            setCurrentPart(4);
            window.scrollTo(0, 0);
          }}
          disabled={!isPart5Complete}
          className="w-full"
          size="lg"
        >
          Continue to Wrap-Up
        </Button>
      </div>
    );
  }

  // Part 4 - Wrap-Up
  if (currentPart === 4) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1>Wrap-Up</h1>
          <p className="text-slate-600">
            Final step before you finish.
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Stay Updated (Optional)
            </Label>
            <p className="text-sm text-slate-600">
              If you'd like to stay in touch or get early access to future testing opportunities, 
              leave your email below.
            </p>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </Card>

        <Button
          onClick={handleFinalSubmit}
          className="w-full"
          size="lg"
        >
          Submit Survey
        </Button>

        <p className="text-xs text-center text-slate-500">
          Your responses are anonymous and will only be used for research purposes.
        </p>
      </div>
    );
  }
}
