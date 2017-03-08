/*
  Live example: http://jsbin.com/qurezot/7/edit?js,output

  I began using Redux with Electron when I was fed up with trying to manage
  state across my applications (even pre-Electron usage). My clients
  wanted the state to be saved in case of a crash or accidental 
  power outage. It was in those moments I decided to give Redux a try.
  (The result: exact state reload on app start up with any-action undo :)
  
  After creating a few applications, I realized I was writing entire apps
  using purely Redux and nothing else. Before this I've been using Angular
  1.5+ as it supports component based development and is in-demand.
  
  This file is my best attempt at a pure Redux solution to components.
  
  Everything is extremely compositional and thus modular.
  
  It is very easy to split up pieces of this file and separate concerns.
  
  I normally never ever use Object.freeze but while brainstorming, I 
  figured it would probably be a good idea to use it. It will encourage
  immutable state, which will make debugging much easier. In an
  enterprise environment this can be valuable. There are a few places
  where impure functions are used out of convenience.
  
  This is meant to be an unopinionated...use of Redux for components (
  I'm not sure what to call it really). It's structured to include
  the absolute basics of a component. The export looks like this:
  
  { create, listen, render, cleanup }
  
  The idea is people don't really need React (or any UI framework) with
  Redux. The idea is to be simple at the core, so we can be complex
  at higher levels of development.
  
  I came up with this use about 2 weeks ago but only revised it over the
  past few days.
  
  Below I implement a simple timer component that can be reset when 
  clicked.
*/


// This would be a module 
(function() {
  'use strict';
 
  // Return a new immutable object with merged propreties of 1...N objects
  Object.prototype.meld = (...o) => Object.freeze(Object.assign({}, ...o))

  // Our actions to dispatch or react on.
  const Actions = Object.freeze({
    TICK: 'tick',
    RESET: 'reset'
  })

  // Can use redux-worker to off-load this to another thread!
  const reducer = function(state = {
    ticks: 0
  }, action) {
    switch(action.type) {
      case Actions.TICK:
        return Object.meld(state, {
          ticks: state.ticks + 1
        })
      case Actions.RESET:
        return Object.meld(state, {
          ticks: 0
        })
      default:
        return state
    }
  }
  
  const store = Redux.createStore(reducer)
 
  // Our template :)
  const html = function(state) {
    return `
      <div>Milliseconds elapsed: ${state.ticks}</div>
    `
  }

  // Maybe make this pure - generateHandlers(store) { return {...} }
  const Handlers = Object.freeze({
    timerClick: (e) => {
      store.dispatch({ type: Actions.TICK })
    }
  })
 
  // Can be setup however you like - very unopinionated, allows
  // you to break it into modules if need be
  const create = function(el, store) {
    const timers = []
    timers.push(setInterval(() => {
      store.dispatch({ type: Actions.TICK })
    }, 1)) 
    
    el.addEventListener('click', Handlers.timerClick)
   
    // Our cleanup function that depends on statements in create()
    return Object.assign(this, {
      destroy: function() {
        timers.forEach(id => clearInterval(id))
      }
    })
  }
  
  const render = function(el, state) {
    el.innerHTML = html(state)
    return this
  }
  
  const listen = function(el, store) {
    return Object.assign(this, {
      ignore: store.subscribe(() => {
        const { ticks } = store.getState()
       
        
        // Memoization can be used here to cache results/avoid renders!
        render(el, store.getState())
        
        // Put cleanup after render() in case we want to play with the final rendered element
        // Again totally up to users - while writing this I actually had it before the render()
        if(ticks >= 1000 * 3) {
          this.cleanup()
        }
      })
    })
  }
  
  const cleanup = function(el, store) {
    this.destroy(); 
    this.ignore(); 
    el.innerHTML += '<br/> Timers destroyed and unsubscribed from state changes.'
    el.innerHTML += '<br/> Normally we would also destroy this element.'
  }
 
  /*
    Because I want to be able to chain methods, I have to use .call(this, ...)
   
    This could be avoided but I want to keep the functions separate from the object
    that is built for reuse and separation.
    
    Someone else can decide this is too much typing/complex, and opt for regular
    function calling: listen(render(create(timer()))) or timer(create(render(listen())))
    if they decide to pass functions in - flexible!
  */
  const timer = function(el) { 
    return {
      create:  function() { return create.call(this, el, store) },
      listen:  function(altStore) { return listen.call(this, el, altStore || store) },
      render:  function(altEl, altState) { return render.call(this, altEl || el, altState || store.getState()) },
      cleanup: function() { cleanup.call(this, el, store) }
    }
  }
  
  // module.exports = timer
  
  // Usage
  const container = document.createElement('div')
  timer(container).create().render().listen()
  
  // Could be put in create, along with container creation...again, up to the user.
  document.body.appendChild(container)
  
})()
