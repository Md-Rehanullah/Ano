import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Github, Code, Users, Lightbulb, ExternalLink, Star, GitFork } from "lucide-react";

const Collaborate = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="bg-gradient-hero text-white rounded-2xl p-12 shadow-glow">
            <Github className="h-16 w-16 mx-auto mb-6 opacity-90" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Let's Build Together
            </h1>
            <p className="text-xl opacity-90 max-w-3xl mx-auto leading-relaxed">
              Join our open-source community and help make this platform even better. 
              Every contribution, big or small, makes a difference!
            </p>
          </div>
        </div>

        {/* GitHub Repository */}
        <Card className="p-8 mb-12 shadow-elegant text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-primary p-4 rounded-2xl mr-4">
              <Github className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">GitHub Repository</h2>
              <p className="text-muted-foreground">
                Explore our codebase, report issues, and contribute to the project
              </p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 mb-8 text-sm">
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <Star className="h-4 w-4" />
              <span>Give us a star</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <GitFork className="h-4 w-4" />
              <span>Fork the repo</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <Code className="h-4 w-4" />
              <span>Make changes</span>
            </div>
          </div>

          <Button size="lg" className="bg-gradient-primary">
            <ExternalLink className="h-5 w-5 mr-2" />
            <a href="https://github.com/Md-Rehanullah" target="_blank" rel="noopener noreferrer">
              Visit GitHub Repository
            </a>
          </Button>
        </Card>

        {/* Ways to Contribute */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Ways to Contribute</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 shadow-card hover:shadow-elegant transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-primary p-3 rounded-lg mr-4">
                  <Code className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold">Code Contributions</h3>
              </div>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Fix bugs and improve performance</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Add new features and enhancements</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Improve mobile responsiveness</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Enhance accessibility features</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8 shadow-card hover:shadow-elegant transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-primary p-3 rounded-lg mr-4">
                  <Lightbulb className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold">Ideas & Feedback</h3>
              </div>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Suggest new features and improvements</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Report bugs and usability issues</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Share design mockups and wireframes</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Provide user experience feedback</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8 shadow-card hover:shadow-elegant transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-primary p-3 rounded-lg mr-4">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold">Community Support</h3>
              </div>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Help other users with questions</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Moderate content and report issues</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Write documentation and tutorials</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Share the platform with others</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8 shadow-card hover:shadow-elegant transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-primary p-3 rounded-lg mr-4">
                  <Github className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold">Development Setup</h3>
              </div>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Fork and clone the repository</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Install dependencies: <code className="bg-muted px-1 rounded">npm install</code></span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Start development: <code className="bg-muted px-1 rounded">npm run dev</code></span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Create pull requests for review</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>

        {/* Tech Stack */}
        <Card className="p-8 shadow-elegant bg-gradient-card">
          <h3 className="text-2xl font-bold text-center mb-8">Tech Stack</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-2">
              <div className="bg-primary/10 p-4 rounded-lg mx-auto w-fit">
                <span className="text-primary font-bold text-lg">⚛️</span>
              </div>
              <h4 className="font-medium">React</h4>
              <p className="text-xs text-muted-foreground">Frontend Framework</p>
            </div>
            <div className="space-y-2">
              <div className="bg-primary/10 p-4 rounded-lg mx-auto w-fit">
                <span className="text-primary font-bold text-lg">🎨</span>
              </div>
              <h4 className="font-medium">Tailwind</h4>
              <p className="text-xs text-muted-foreground">CSS Framework</p>
            </div>
            <div className="space-y-2">
              <div className="bg-primary/10 p-4 rounded-lg mx-auto w-fit">
                <span className="text-primary font-bold text-lg">📱</span>
              </div>
              <h4 className="font-medium">Capacitor</h4>
              <p className="text-xs text-muted-foreground">Mobile Development</p>
            </div>
            <div className="space-y-2">
              <div className="bg-primary/10 p-4 rounded-lg mx-auto w-fit">
                <span className="text-primary font-bold text-lg">🍃</span>
              </div>
              <h4 className="font-medium">MongoDB</h4>
              <p className="text-xs text-muted-foreground">Database</p>
            </div>
          </div>
        </Card>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <h2 className="text-2xl font-bold mb-6">Ready to Contribute?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Whether you're a seasoned developer or just getting started, there's a place for you in our community. 
            Let's build something amazing together!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gradient-primary">
              <Github className="h-5 w-5 mr-2" />
              <a href="https://github.com/Md-Rehanullah" target="_blank" rel="noopener noreferrer">
                View on GitHub
              </a>
            </Button>
            <Button size="lg" variant="outline">
              <ExternalLink className="h-5 w-5 mr-2" />
              Read Contributing Guide
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Collaborate;