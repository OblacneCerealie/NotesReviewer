import { HashRouter, Routes, Route } from 'react-router-dom';
import AuthGate from './components/AuthGate';
import Home from './pages/Home';
import Quiz from './pages/Quiz';
import './App.css';

function App() {
  return (
    <AuthGate>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz" element={<Quiz />} />
        </Routes>
      </HashRouter>
    </AuthGate>
  );
}

export default App;
